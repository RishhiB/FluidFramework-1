/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import type {
	IContainerContext,
	IRuntime,
	IRuntimeFactory,
} from "@fluidframework/container-definitions/legacy";
import { loadContainerRuntime } from "@fluidframework/container-runtime/legacy";
import type { IContainerRuntime } from "@fluidframework/container-runtime-definitions/legacy";
import type { FluidObject } from "@fluidframework/core-interfaces";

import { DiceRollerFactory } from "./diceRoller/index.js";

// Use the IDs that MeTA processor expects for tree-based data objects
const diceRollerId = "treeRootDOId"; // Data store ID
const diceRollerRegistryKey = "treeRootDO"; // Registry type key
const diceRollerFactory = new DiceRollerFactory();

export class DiceRollerContainerRuntimeFactory implements IRuntimeFactory {
	public get IRuntimeFactory(): IRuntimeFactory {
		return this;
	}

	public async instantiateRuntime(
		context: IContainerContext,
		existing: boolean,
	): Promise<IRuntime> {
		const provideEntryPoint = async (
			entryPointRuntime: IContainerRuntime,
		): Promise<FluidObject> => {
			const diceRollerHandle =
				await entryPointRuntime.getAliasedDataStoreEntryPoint(diceRollerId);
			if (diceRollerHandle === undefined) {
				throw new Error("Dice roller missing!");
			}
			return diceRollerHandle.get();
		};

		const runtime = await loadContainerRuntime({
			context,
			registryEntries: new Map([[diceRollerRegistryKey, Promise.resolve(diceRollerFactory)]]),
			provideEntryPoint,
			existing,
			// Enable runtime ID compression which is required for SharedTree
			runtimeOptions: {
				enableRuntimeIdCompressor: "on",
			},
		});

		if (!existing) {
			const diceRoller = await runtime.createDataStore(diceRollerRegistryKey);
			await diceRoller.trySetAlias(diceRollerId);
		}

		return runtime;
	}
}
