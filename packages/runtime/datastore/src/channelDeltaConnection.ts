/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { assert } from "@fluidframework/core-utils/internal";
import {
	IDeltaConnection,
	IDeltaHandler,
} from "@fluidframework/datastore-definitions/internal";
import type {
	IRuntimeMessageCollection,
	IRuntimeMessagesContent,
} from "@fluidframework/runtime-definitions/internal";
import { DataProcessingError } from "@fluidframework/telemetry-utils/internal";

const stashedOpMetadataMark = Symbol();

type StashedOpMetadata = { contents: unknown; metadata: unknown }[] &
	Record<typeof stashedOpMetadataMark, typeof stashedOpMetadataMark>;

function createStashedOpMetadata(): StashedOpMetadata {
	const arr = [];
	Object.defineProperty(arr, stashedOpMetadataMark, {
		value: stashedOpMetadataMark,
		writable: false,
		enumerable: true,
	});
	return arr as unknown as StashedOpMetadata;
}

function isStashedOpMetadata(md: unknown): md is StashedOpMetadata {
	return (
		Array.isArray(md) &&
		stashedOpMetadataMark in md &&
		md[stashedOpMetadataMark] === stashedOpMetadataMark
	);
}

function processWithStashedOpMetadataHandling(
	content: unknown,
	localOpMetaData: unknown,
	func: (contents: unknown, metadata: unknown) => void,
): void {
	if (isStashedOpMetadata(localOpMetaData)) {
		for (const { contents, metadata } of localOpMetaData) func(contents, metadata);
	} else {
		func(content, localOpMetaData);
	}
}

function getContentsWithStashedOpHandling(
	messagesContent: readonly IRuntimeMessagesContent[],
): IRuntimeMessagesContent[] {
	const newMessageContents: IRuntimeMessagesContent[] = [];
	for (const messageContent of messagesContent) {
		if (isStashedOpMetadata(messageContent.localOpMetadata)) {
			for (const { contents, metadata } of messageContent.localOpMetadata) {
				newMessageContents.push({
					contents,
					localOpMetadata: metadata,
					clientSequenceNumber: messageContent.clientSequenceNumber,
				});
			}
		} else {
			newMessageContents.push(messageContent);
		}
	}
	return newMessageContents;
}

export class ChannelDeltaConnection implements IDeltaConnection {
	private _handler: IDeltaHandler | undefined;
	private stashedOpMd: StashedOpMetadata | undefined;

	private get handler(): IDeltaHandler {
		assert(!!this._handler, 0x177 /* "Missing delta handler" */);
		return this._handler;
	}
	public get connected(): boolean {
		return this._connected;
	}

	constructor(
		private _connected: boolean,
		private readonly submitFn: (content: unknown, localOpMetadata: unknown) => void,
		public readonly dirty: () => void,
		private readonly isAttachedAndVisible: () => boolean,
	) {}

	public attach(handler: IDeltaHandler): void {
		assert(this._handler === undefined, 0x178 /* "Missing delta handler on attach" */);
		this._handler = handler;
	}

	public setConnectionState(connected: boolean): void {
		this._connected = connected;
		this.handler.setConnectionState(connected);
	}

	public processMessages(messageCollection: IRuntimeMessageCollection): void {
		// catches as data processing error whether or not they come from async pending queues
		try {
			const newMessagesContent = getContentsWithStashedOpHandling(
				messageCollection.messagesContent,
			);
			this.handler.processMessages({
				...messageCollection,
				messagesContent: newMessagesContent,
			});
		} catch (error) {
			throw DataProcessingError.wrapIfUnrecognized(
				error,
				"channelDeltaConnectionFailedToProcessMessages",
				messageCollection.envelope,
			);
		}
	}

	public reSubmit(content: unknown, localOpMetadata: unknown, squash: boolean): void {
		processWithStashedOpMetadataHandling(content, localOpMetadata, (contents, metadata) =>
			this.handler.reSubmit(contents, metadata, squash),
		);
	}

	public rollback(content: unknown, localOpMetadata: unknown): void {
		if (this.handler.rollback === undefined) {
			throw new Error("Handler doesn't support rollback");
		}
		processWithStashedOpMetadataHandling(
			content,
			localOpMetadata,
			this.handler.rollback.bind(this.handler),
		);
	}

	public applyStashedOp(content: unknown): unknown {
		try {
			this.stashedOpMd = this.isAttachedAndVisible() ? createStashedOpMetadata() : undefined;
			this.handler.applyStashedOp(content);
			return this.stashedOpMd;
		} finally {
			this.stashedOpMd = undefined;
		}
	}

	public submit(contents: unknown, metadata: unknown): void {
		if (this.stashedOpMd === undefined) {
			this.submitFn(contents, metadata);
		} else {
			this.stashedOpMd.push({ contents, metadata });
		}
	}
}
