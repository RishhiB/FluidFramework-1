/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import { assert } from "@fluidframework/core-utils/internal";
import type { LazyItem } from "../flexList.js";
import type {
	AllowedTypeMetadata,
	AllowedTypesMetadata,
	AnnotatedAllowedTypes,
	ImplicitAnnotatedAllowedTypes,
	TreeLeafValue,
} from "../schemaTypes.js";
import type { SimpleNodeSchemaBase } from "../simpleSchema.js";

import type { TreeNode } from "./treeNode.js";
import type { InternalTreeNode, Unhydrated } from "./types.js";

/**
 * Schema for a {@link TreeNode} or {@link TreeLeafValue}.
 *
 * @typeParam Name - The full (including scope) name/identifier for the schema.
 * @typeParam Kind - Which kind of node this schema is for.
 * @typeParam TNode - API for nodes that use this schema.
 * @typeParam TBuild - Data which can be used to construct an {@link Unhydrated} node of this type.
 * @typeParam Info - Data used when defining this schema.
 * @remarks
 * Captures the schema both as runtime data and compile time type information.
 * Use {@link SchemaFactory} to define schema.
 * Use `Tree.schema(value)` to lookup the schema for a {@link TreeNode} or {@link TreeLeafValue}.
 * @privateRemarks
 * TODO:
 * The long lists of type parameters here are awkward to deal with.
 * Switching to (or adding an option to use)
 * an interface based pattern with unordered named parameters for types like this would be a good idea.
 * The related `@system` types should be simple to port to the new pattern, but stable public one like this will need to support both:
 * the new one could either be added as a system type, or be recommended to replace this one (deprecating it).
 * @sealed @public
 */
export type TreeNodeSchema<
	Name extends string = string,
	Kind extends NodeKind = NodeKind,
	TNode extends TreeNode | TreeLeafValue = TreeNode | TreeLeafValue,
	TBuild = never,
	ImplicitlyConstructable extends boolean = boolean,
	Info = unknown,
	TCustomMetadata = unknown,
> =
	| (TNode extends TreeNode
			? TreeNodeSchemaClass<
					Name,
					Kind,
					TNode,
					TBuild,
					ImplicitlyConstructable,
					Info,
					never,
					TCustomMetadata
				>
			: never)
	| TreeNodeSchemaNonClass<
			Name,
			Kind,
			TNode,
			TBuild,
			ImplicitlyConstructable,
			Info,
			never,
			TCustomMetadata
	  >;

/**
 * Stores annotations for an individual allowed type.
 * @alpha
 */
export interface AnnotatedAllowedType<T = LazyItem<TreeNodeSchema>> {
	/**
	 * Annotations for the allowed type.
	 */
	readonly metadata: AllowedTypeMetadata;
	/**
	 * The allowed type the annotations apply to in a particular schema.
	 */
	readonly type: T;
}

/**
 * Stores annotations for a set of evaluated annotated allowed types.
 * @alpha
 */
export interface NormalizedAnnotatedAllowedTypes {
	/**
	 * Annotations that apply to a set of allowed types.
	 */
	readonly metadata: AllowedTypesMetadata;
	/**
	 * All the evaluated allowed types that the annotations apply to. The types themselves are also individually annotated.
	 */
	readonly types: readonly AnnotatedAllowedType<TreeNodeSchema>[];
}

/**
 * Checks if the input is an {@link AnnotatedAllowedTypes}.
 */
export function isAnnotatedAllowedTypes(
	allowedTypes: ImplicitAnnotatedAllowedTypes,
): allowedTypes is AnnotatedAllowedTypes {
	return (
		// Class based schema, and lazy schema references report type "function": filtering them out with typeof makes narrowing based on members mostly safe
		typeof allowedTypes === "object" && "metadata" in allowedTypes && "types" in allowedTypes
	);
}

/**
 * Schema which is not a class.
 * @remarks
 * This is used for schema which cannot have their instances constructed using constructors, like leaf schema.
 * @privateRemarks
 * Non-class based schema can have issues with recursive types due to https://github.com/microsoft/TypeScript/issues/55832.
 * @system @sealed @public
 */
export type TreeNodeSchemaNonClass<
	Name extends string = string,
	Kind extends NodeKind = NodeKind,
	TNode extends TreeNode | TreeLeafValue = TreeNode | TreeLeafValue,
	TInsertable = never,
	ImplicitlyConstructable extends boolean = boolean,
	Info = unknown,
	TConstructorExtra = never,
	TCustomMetadata = unknown,
> = TreeNodeSchemaCore<
	Name,
	Kind,
	ImplicitlyConstructable,
	Info,
	TInsertable,
	TCustomMetadata
> &
	(undefined extends TConstructorExtra
		? {
				/**
				 * Constructs an {@link Unhydrated} node with this schema.
				 * @privateRemarks
				 * Also allows InternalTreeNode.
				 * @sealed
				 */
				create(data?: TInsertable | TConstructorExtra): TNode;
			}
		: {
				/**
				 * Constructs an {@link Unhydrated} node with this schema.
				 * @privateRemarks
				 * Also allows InternalTreeNode.
				 * @sealed
				 */
				create(data: TInsertable | TConstructorExtra): TNode;
			});

/**
 * Tree node schema which is implemented using a class.
 * @remarks
 * Instances of this class are nodes in the tree.
 * This is also a constructor so that it can be subclassed.
 *
 * Using classes in this way allows introducing a named type and a named value at the same time, helping keep the runtime and compile time information together and easy to refer to un a uniform way.
 * Additionally, this works around https://github.com/microsoft/TypeScript/issues/55832 which causes similar patterns with less explicit types to infer "any" in the d.ts file.
 *
 * When sub-classing a a `TreeNodeSchemaClass`, some extra rules must be followed:
 *
 * - Only ever use a single class from the schema's class hierarchy within a document and its schema.
 * For example, if using {@link SchemaFactory.object} you can do:
 * ```typescript
 * // Recommended "customizable" object schema pattern.
 * class Good extends schemaFactory.object("A", {
 * 	exampleField: schemaFactory.number,
 * }) {
 * 	public exampleCustomMethod(): void {
 * 		this.exampleField++;
 * 	}
 * }
 * ```
 * But should avoid:
 * ```typescript
 * // This by itself is ok, and opts into "POJO mode".
 * const base = schemaFactory.object("A", {});
 * // This is a bad pattern since it leaves two classes in scope which derive from the same SchemaFactory defined class.
 * // If both get used, its an error!
 * class Invalid extends base {}
 * ```
 *
 * - Do not modify the constructor input parameter types or values:
 * ```typescript
 * class Invalid extends schemaFactory.object("A", {
 * 	exampleField: schemaFactory.number,
 * }) {
 * 	// This Modifies the type of the constructor input.
 * 	// This is unsupported due to programmatic access to the constructor being used internally.
 * 	public constructor(a: number) {
 * 		super({ exampleField: a });
 * 	}
 * }
 * ```
 * @sealed @public
 */
export type TreeNodeSchemaClass<
	Name extends string = string,
	Kind extends NodeKind = NodeKind,
	TNode extends TreeNode = TreeNode,
	TInsertable = never,
	ImplicitlyConstructable extends boolean = boolean,
	Info = unknown,
	TConstructorExtra = never,
	TCustomMetadata = unknown,
> = TreeNodeSchemaCore<
	Name,
	Kind,
	ImplicitlyConstructable,
	Info,
	TInsertable,
	TCustomMetadata
> &
	(undefined extends TConstructorExtra
		? {
				/**
				 * Constructs an {@link Unhydrated} node with this schema.
				 * @remarks
				 * This constructor is also used internally to construct hydrated nodes with a different parameter type.
				 * Therefore, overriding this constructor with different argument types is not type-safe and is not supported.
				 * @sealed
				 */
				// The approach suggested by the linter here is more concise, but ir break intellisense for the constructor.
				// eslint-disable-next-line @typescript-eslint/prefer-function-type
				new (data?: TInsertable | InternalTreeNode | TConstructorExtra): Unhydrated<TNode>;
			}
		: {
				/**
				 * Constructs an {@link Unhydrated} node with this schema.
				 * @remarks
				 * This constructor is also used internally to construct hydrated nodes with a different parameter type.
				 * Therefore, overriding this constructor with different argument types is not type-safe and is not supported.
				 * @sealed
				 */
				// The approach suggested by the linter here is more concise, but ir break intellisense for the constructor.
				// eslint-disable-next-line @typescript-eslint/prefer-function-type
				new (data: TInsertable | InternalTreeNode | TConstructorExtra): Unhydrated<TNode>;
			});

/**
 * Internal helper for utilities that return schema which can be used in class and non class formats depending on the API exposing it.
 */
export type TreeNodeSchemaBoth<
	Name extends string = string,
	Kind extends NodeKind = NodeKind,
	TNode extends TreeNode = TreeNode,
	TInsertable = never,
	ImplicitlyConstructable extends boolean = boolean,
	Info = unknown,
	TConstructorExtra = never,
	TCustomMetadata = unknown,
> = TreeNodeSchemaClass<
	Name,
	Kind,
	TNode,
	TInsertable,
	ImplicitlyConstructable,
	Info,
	TConstructorExtra,
	TCustomMetadata
> &
	TreeNodeSchemaNonClass<
		Name,
		Kind,
		TNode,
		TInsertable,
		ImplicitlyConstructable,
		Info,
		TConstructorExtra,
		TCustomMetadata
	>;

/**
 * Data common to all tree node schema.
 *
 * @remarks
 * Implementation detail of {@link TreeNodeSchema} which should be accessed instead of referring to this type directly.
 *
 * @privateRemarks
 * All implementations must implement {@link TreeNodeSchemaCorePrivate} as well.
 *
 * @sealed @public
 */
export interface TreeNodeSchemaCore<
	out Name extends string,
	out Kind extends NodeKind,
	out ImplicitlyConstructable extends boolean,
	out Info = unknown,
	out TInsertable = never,
	out TCustomMetadata = unknown,
> extends SimpleNodeSchemaBase<Kind, TCustomMetadata> {
	/**
	 * Unique (within a document's schema) identifier used to associate nodes with their schema.
	 * @remarks
	 * This is used when encoding nodes, and when decoding nodes to re-associate them with the schema.
	 * Since this decoding may happen in a different version of the application (or even a different application altogether),
	 * this identifier should generally correspond to some specific semantics for the data (how to interpret the node with this identifier).
	 * Any time the semantics change such that data would be misinterpreted if the old semantics were applied
	 * (for example the units of a value are changed),
	 * it is best practice to pick a new identifier.
	 */
	readonly identifier: Name;

	/**
	 * Data used to define this schema.
	 *
	 * @remarks
	 * The format depends on the kind of node it is for.
	 * For example, the "object" node kind could store the field schema here.
	 */
	readonly info: Info;

	/**
	 * When constructing insertable content,
	 * data that could be passed to the node's constructor can be used instead of an {@link Unhydrated} node
	 * iff implicitlyConstructable is true.
	 * @privateRemarks
	 * Currently the logic for traversing insertable content,
	 * both to build trees and to hydrate them does not defer to the schema classes to handle the policy,
	 * so if their constructors differ from what is supported, some cases will not work.
	 * Setting this to false adjusts the insertable types to disallow cases which could be impacted by these inconsistencies.
	 */
	readonly implicitlyConstructable: ImplicitlyConstructable;

	/**
	 * All possible schema that a direct child of a node with this schema could have.
	 *
	 * Equivalently, this is also all schema directly referenced when defining this schema's allowed child types,
	 * which is also the same as the set of schema referenced directly by the `Info` type parameter and the `info` property.
	 * This property is simply re-exposing that information in an easier to traverse format consistent across all node kinds.
	 * @remarks
	 * Some kinds of nodes may have additional restrictions on children:
	 * this set simply enumerates all directly referenced schema, and can be use to walk over all referenced schema types.
	 *
	 * This set cannot be used before the schema in it have been defined:
	 * more specifically, when using lazy schema references (for example to make foreword references to schema which have not yet been defined),
	 * users must wait until after the schema are defined to access this set.
	 * @privateRemarks
	 * Currently there isn't much use for this in the public API,
	 * and it's possible this will want to be tweaked or renamed as part of a larger schema reflection API surface that might be added later.
	 * To keep options option, this is marked `@system` for now.
	 * @system
	 */
	readonly childTypes: ReadonlySet<TreeNodeSchema>;

	/**
	 * Constructs an instance of this node type.
	 * @remarks
	 * Due to TypeScript limitations, the return type of this method can not be very specific.
	 * For {@link TreeNodeSchemaClass} prefer using the constructor directly for better typing.
	 * For {@link TreeNodeSchemaNonClass} use `create`.
	 *
	 * @privateRemarks
	 * This method signature provides a way to infer `TInsertable` without relying on the constructor, and to construct nodes from schema of unknown kind.
	 * This makes customizations of the constructor not impact the typing of insertable content, allowing customization of the constructor,
	 * as long as doing so only adds additional supported cases.
	 *
	 * This cannot be required to return `TNode`:
	 * doing so breaks sub-classing of schema since they don't overload this method with a more specific return type.
	 * @sealed @system
	 */
	createFromInsertable(data: TInsertable): Unhydrated<TreeNode | TreeLeafValue>;
}

/**
 * {@link TreeNodeSchemaCore} extended with some non-exported APIs.
 */
export interface TreeNodeSchemaCorePrivate<
	Name extends string = string,
	Kind extends NodeKind = NodeKind,
	TInsertable = never,
	ImplicitlyConstructable extends boolean = boolean,
	Info = unknown,
	TCustomMetadata = unknown,
> extends TreeNodeSchemaCore<
		Name,
		Kind,
		ImplicitlyConstructable,
		Info,
		TInsertable,
		TCustomMetadata
	> {
	/**
	 * All possible annotated allowed types that a field under a node with this schema could have.
	 * @remarks
	 * In this case "field" includes anything that is a field in the internal (flex-tree) abstraction layer.
	 * This includes the content field for arrays, and all the fields for map nodes.
	 * If this node does not have fields (and thus is a leaf), the array will be empty.
	 *
	 * This set cannot be used before the schema in it have been defined:
	 * more specifically, when using lazy schema references (for example to make foreword references to schema which have not yet been defined),
	 * users must wait until after the schema are defined to access this array.
	 *
	 * @privateRemarks
	 * If this is stabilized, it will live alongside the childTypes property on {@link TreeNodeSchemaCore}.
	 * @system
	 */
	readonly childAnnotatedAllowedTypes: readonly NormalizedAnnotatedAllowedTypes[];
}

/**
 * Downcasts a {@link TreeNodeSchemaCore} to {@link TreeNodeSchemaCorePrivate} if it is one.
 *
 * @remarks
 * This function should only be used internally. The result should not be exposed publicly
 * in any exported types or API return values.
 */
export function asTreeNodeSchemaCorePrivate(
	schema: TreeNodeSchemaCore<string, NodeKind, boolean>,
): TreeNodeSchemaCorePrivate {
	assert(
		"childAnnotatedAllowedTypes" in schema,
		0xbc9 /* All implementations of TreeNodeSchemaCore must also implement TreeNodeSchemaCorePrivate */,
	);
	assert(
		Array.isArray((schema as TreeNodeSchemaCorePrivate).childAnnotatedAllowedTypes),
		0xbca /* All implementations of TreeNodeSchemaCore must also implement TreeNodeSchemaCorePrivate */,
	);
	return schema as TreeNodeSchemaCorePrivate;
}

/**
 * Kind of tree node.
 * @remarks
 * More kinds may be added over time, so do not assume this is an exhaustive set.
 * @public
 */
export enum NodeKind {
	/**
	 * A node which serves as a map, storing children under string keys.
	 */
	Map,
	/**
	 * A node which serves as an array, storing children in an ordered sequence.
	 */
	Array,
	/**
	 * A node which stores a heterogenous collection of children in named fields.
	 * @remarks
	 * Each field gets its own schema.
	 */
	Object,
	/**
	 * A node which stores a single leaf value.
	 */
	Leaf,
}
