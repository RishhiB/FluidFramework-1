/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { IIntegerRange } from "./client.js";
import { UniversalSequenceNumber } from "./constants.js";
import { MergeTree } from "./mergeTree.js";
import { ISegmentPrivate } from "./mergeTreeNodes.js";
import { PriorPerspective, type Perspective } from "./perspective.js";
import { IMergeTreeTextHelper, TextSegment } from "./textSegment.js";

interface ITextAccumulator {
	textSegment: TextSegment;
	placeholder?: string;
	parallelArrays?: boolean;
}

export class MergeTreeTextHelper implements IMergeTreeTextHelper {
	constructor(private readonly mergeTree: MergeTree) {}

	public getText(
		refSeq: number,
		clientId: number,
		placeholder = "",
		start?: number,
		end?: number,
	): string {
		const perspective =
			refSeq === UniversalSequenceNumber || clientId === this.mergeTree.collabWindow.clientId
				? this.mergeTree.localPerspective
				: new PriorPerspective(refSeq, clientId);
		const range = this.getValidRange(start, end, perspective);

		const accum: ITextAccumulator = { textSegment: new TextSegment(""), placeholder };

		this.mergeTree.mapRange<ITextAccumulator>(
			gatherText,
			perspective,
			accum,
			range.start,
			range.end,
		);
		return accum.textSegment.text;
	}

	private getValidRange(
		start: number | undefined,
		end: number | undefined,
		perspective: Perspective,
	): IIntegerRange {
		const range: IIntegerRange = {
			end: end ?? this.mergeTree.getLength(perspective),
			start: start ?? 0,
		};
		return range;
	}
}

function gatherText(
	segment: ISegmentPrivate,
	pos: number,
	refSeq: number,
	clientId: number,
	start: number,
	end: number,
	{ textSegment, placeholder }: ITextAccumulator,
): boolean {
	if (TextSegment.is(segment)) {
		if (start <= 0 && end >= segment.text.length) {
			textSegment.text += segment.text;
		} else {
			const seglen = segment.text.length;
			const _start = start < 0 ? 0 : start;
			const _end = end >= seglen ? undefined : end;
			textSegment.text += segment.text.slice(_start, _end);
		}
	} else if (placeholder && placeholder.length > 0) {
		const placeholderText =
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			placeholder === "*" ? `\n${segment}` : placeholder.repeat(segment.cachedLength);
		textSegment.text += placeholderText;
	}

	return true;
}
