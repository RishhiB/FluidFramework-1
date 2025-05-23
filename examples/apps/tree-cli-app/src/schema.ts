/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { SchemaFactory } from "@fluidframework/tree";
import { TreeViewConfigurationAlpha } from "@fluidframework/tree/alpha";

/**
 * The SchemaFactory.
 */
export const schemaBuilder = new SchemaFactory("com.fluidframework.example.cli");

class Point extends schemaBuilder.object("Point", {
	x: schemaBuilder.number,
	y: schemaBuilder.number,
}) {}

/**
 * Complex list item.
 */
export class Item extends schemaBuilder.object("Item", {
	position: schemaBuilder.required(Point, { key: "location" }),
	name: schemaBuilder.string,
}) {}

/**
 * List node.
 */
export class List extends schemaBuilder.array("List", [schemaBuilder.string, Item]) {}

/**
 * Tree configuration.
 */
export const config = new TreeViewConfigurationAlpha({
	schema: List,
	enableSchemaValidation: true,
	preventAmbiguity: true,
});
