/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { TypedEventEmitter } from "@fluid-internal/client-utils";
import type { IEventProvider } from "@fluidframework/core-interfaces";
import { assert } from "@fluidframework/core-utils/legacy";
import { FluidDataStoreRuntime } from "@fluidframework/datastore/legacy";
import type {
	IChannelFactory,
	IFluidDataStoreRuntime,
} from "@fluidframework/datastore-definitions/legacy";
import { getPresenceFromDataStoreContext } from "@fluidframework/presence/legacy/alpha";
import type {
	IFluidDataStoreChannel,
	IFluidDataStoreContext,
	IFluidDataStoreFactory,
} from "@fluidframework/runtime-definitions/legacy";
import {
	type ITree,
	SchemaFactory,
	SharedTree,
	TreeViewConfiguration,
	type TreeView,
} from "@fluidframework/tree/legacy";

import type { EntryPoint, IDiceRoller, IDiceRollerEvents } from "./interface.js";

// Define the schema for our dice roller data
const sf = new SchemaFactory("dice-roller");

class DiceRollerData extends sf.object("DiceRollerData", {
	diceValue: sf.number,
}) {}

const treeViewConfig = new TreeViewConfiguration({
	schema: DiceRollerData,
});

/**
 * The DiceRoller is our data object that implements the IDiceRoller interface.
 */
class DiceRoller implements IDiceRoller {
	private readonly _events = new TypedEventEmitter<IDiceRollerEvents>();
	public get events(): IEventProvider<IDiceRollerEvents> {
		return this._events;
	}

	public constructor(private readonly treeView: TreeView<typeof DiceRollerData>) {
		// Listen for changes to the tree
		this.treeView.events.on("commitApplied", () => {
			this._events.emit("diceRolled");
		});
	}

	public get value() {
		const value = this.treeView.root.diceValue;
		assert(typeof value === "number", "Bad dice value");
		return value;
	}

	public readonly roll = () => {
		const rollValue = Math.floor(Math.random() * 6) + 1;
		this.treeView.root.diceValue = rollValue;
	};
}

const treeId = "root-tree"; // Channel ID expected by MeTA processor
const treeFactory = SharedTree.getFactory();
const diceRollerSharedObjectRegistry = new Map<string, IChannelFactory>([
	[treeFactory.type, treeFactory],
]);

export class DiceRollerFactory implements IFluidDataStoreFactory {
	public get type(): string {
		throw new Error("Do not use the type on the data store factory");
	}

	public get IFluidDataStoreFactory(): IFluidDataStoreFactory {
		return this;
	}

	public async instantiateDataStore(
		context: IFluidDataStoreContext,
		existing: boolean,
	): Promise<IFluidDataStoreChannel> {
		// Store the tree view so we only create it once
		let cachedTreeView: TreeView<typeof DiceRollerData> | undefined;

		const runtime: FluidDataStoreRuntime = new FluidDataStoreRuntime(
			context,
			diceRollerSharedObjectRegistry,
			existing,
			async (entryPointRuntime: IFluidDataStoreRuntime): Promise<EntryPoint> => {
				// Only create the view once
				if (!cachedTreeView) {
					const tree = (await entryPointRuntime.getChannel(treeId)) as unknown as ITree;
					cachedTreeView = tree.viewWith(treeViewConfig);

					// Initialize if it's a new container
					if (!existing && cachedTreeView.compatibility.canInitialize) {
						cachedTreeView.initialize(new DiceRollerData({ diceValue: 1 }));
					}
				}

				// Check compatibility
				if (cachedTreeView.compatibility.canView) {
					return {
						diceRoller: new DiceRoller(cachedTreeView),
						presence: getPresenceFromDataStoreContext(context),
					};
				} else {
					throw new Error("Tree schema is not compatible with the current version");
				}
			},
		);

		if (!existing) {
			// Create the tree channel
			const tree = runtime.createChannel(treeId, treeFactory.type) as unknown as ITree;
			// Bind it to the context so it's available when provideEntryPoint is called
			(tree as any).bindToContext();
		}

		return runtime;
	}
}
