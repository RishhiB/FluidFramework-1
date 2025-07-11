/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

import {
	type ArrayNodeCustomizableSchema,
	arraySchema,
	type MapNodeCustomizableSchema,
	mapSchema,
	type ObjectNodeSchema,
	objectSchema,
} from "../node-kinds/index.js";
import {
	defaultSchemaFactoryObjectOptions,
	SchemaFactory,
	schemaStatics,
	type SchemaFactoryObjectOptions,
	type ScopedSchemaName,
} from "./schemaFactory.js";
import type {
	ImplicitAllowedTypes,
	ImplicitAnnotatedAllowedTypes,
	ImplicitAnnotatedFieldSchema,
	ImplicitFieldSchema,
	NodeSchemaOptionsAlpha,
} from "../schemaTypes.js";
import type { RestrictiveStringRecord } from "../../util/index.js";
import type { NodeKind, TreeNodeSchemaClass } from "../core/index.js";
import type {
	ArrayNodeCustomizableSchemaUnsafe,
	MapNodeCustomizableSchemaUnsafe,
	System_Unsafe,
} from "./typesUnsafe.js";
import type { SimpleObjectNodeSchema } from "../simpleSchema.js";

/**
 * {@link SchemaFactory} with additional alpha APIs.
 *
 * @alpha
 * @privateRemarks
 *
 * Some private methods on `SchemaFactory` are intentionally duplicated here to avoid increasing their exposure to `protected`.
 * If we were to do so, they would be exposed on the public API surface of `SchemaFactory`.
 */
export class SchemaFactoryAlpha<
	out TScope extends string | undefined = string | undefined,
	TName extends number | string = string,
> extends SchemaFactory<TScope, TName> {
	private scoped2<Name extends TName | string>(name: Name): ScopedSchemaName<TScope, Name> {
		return (
			this.scope === undefined ? `${name}` : `${this.scope}.${name}`
		) as ScopedSchemaName<TScope, Name>;
	}

	/**
	 * Define a {@link TreeNodeSchemaClass} for a {@link TreeObjectNode}.
	 *
	 * @param name - Unique identifier for this schema within this factory's scope.
	 * @param fields - Schema for fields of the object node's schema. Defines what children can be placed under each key.
	 * @param options - Additional options for the schema.
	 */
	public objectAlpha<
		const Name extends TName,
		const T extends RestrictiveStringRecord<ImplicitAnnotatedFieldSchema>,
		const TCustomMetadata = unknown,
	>(
		name: Name,
		fields: T,
		options?: SchemaFactoryObjectOptions<TCustomMetadata>,
	): ObjectNodeSchema<ScopedSchemaName<TScope, Name>, T, true, TCustomMetadata> & {
		/**
		 * Typing checking workaround: not for for actual use.
		 * @remarks
		 * This API collides with {@link TreeNodeSchemaCore.createFromInsertable} to disable a type checking optimization which produces different and undesired results.
		 * See {@link https://github.com/microsoft/TypeScript/issues/59049#issuecomment-2773459693} for more details.
		 * @privateRemarks
		 * The specific issue here is non-empty POJO mode object schema not being assignable to `ObjectNodeSchema`,
		 * See the above link and the tests in objectNode.spec.ts which reference it.
		 * @system
		 */
		readonly createFromInsertable: unknown;
	} {
		return objectSchema(
			this.scoped2(name),
			fields,
			true,
			options?.allowUnknownOptionalFields ??
				defaultSchemaFactoryObjectOptions.allowUnknownOptionalFields,
			options?.metadata,
			options?.persistedMetadata,
		);
	}

	/**
	 * {@inheritdoc SchemaFactory.objectRecursive}
	 */
	public override objectRecursive<
		const Name extends TName,
		const T extends RestrictiveStringRecord<System_Unsafe.ImplicitFieldSchemaUnsafe>,
		const TCustomMetadata = unknown,
	>(
		name: Name,
		t: T,
		options?: SchemaFactoryObjectOptions<TCustomMetadata>,
	): TreeNodeSchemaClass<
		ScopedSchemaName<TScope, Name>,
		NodeKind.Object,
		System_Unsafe.TreeObjectNodeUnsafe<T, ScopedSchemaName<TScope, Name>>,
		object & System_Unsafe.InsertableObjectFromSchemaRecordUnsafe<T>,
		false,
		T,
		never,
		TCustomMetadata
	> &
		SimpleObjectNodeSchema<TCustomMetadata> &
		// We can't just use non generic `ObjectNodeSchema` here since "Base constructors must all have the same return type".
		// We also can't just use generic `ObjectNodeSchema` here and not `TreeNodeSchemaClass` since that doesn't work with unsafe recursive types.
		// ObjectNodeSchema<
		// 	ScopedSchemaName<TScope, Name>,
		// 	//  T & RestrictiveStringRecord<ImplicitFieldSchema> would be nice to use here, but it breaks the recursive type self references.
		// 	RestrictiveStringRecord<ImplicitFieldSchema>,
		// 	false,
		// 	TCustomMetadata
		// >
		Pick<ObjectNodeSchema, "fields"> {
		// TODO: syntax highting is vs code is broken here. Don't trust it. Use the compiler instead.
		type TScopedName = ScopedSchemaName<TScope, Name>;
		return this.objectAlpha(
			name,
			t as T & RestrictiveStringRecord<ImplicitFieldSchema>,
			options,
		) as unknown as TreeNodeSchemaClass<
			TScopedName,
			NodeKind.Object,
			System_Unsafe.TreeObjectNodeUnsafe<T, TScopedName>,
			object & System_Unsafe.InsertableObjectFromSchemaRecordUnsafe<T>,
			false,
			T,
			never,
			TCustomMetadata
		> &
			ObjectNodeSchema<
				ScopedSchemaName<TScope, Name>,
				RestrictiveStringRecord<ImplicitFieldSchema>,
				false,
				TCustomMetadata
			>;
	}

	/**
	 * {@inheritDoc SchemaStatics.leaves}
	 */
	public static override readonly leaves = schemaStatics.leaves;

	/**
	 * {@inheritDoc SchemaStatics.optional}
	 */
	public static override readonly optional = schemaStatics.optional;

	/**
	 * {@inheritDoc SchemaStatics.required}
	 */
	public static override readonly required = schemaStatics.required;

	/**
	 * {@inheritDoc SchemaStatics.optionalRecursive}
	 */
	public static override readonly optionalRecursive = schemaStatics.optionalRecursive;

	/**
	 * {@inheritDoc SchemaStatics.requiredRecursive}
	 */
	public static override readonly requiredRecursive = schemaStatics.requiredRecursive;

	/**
	 * Like {@link SchemaFactory.identifier} but static and a factory function that can be provided {@link FieldProps}.
	 */
	public static readonly identifier = schemaStatics.identifier;

	/**
	 * {@inheritDoc SchemaStatics.leaves}
	 */
	public override readonly leaves = schemaStatics.leaves;

	/**
	 * {@inheritDoc SchemaStatics.optional}
	 */
	public override readonly optional = schemaStatics.optional;

	/**
	 * {@inheritDoc SchemaStatics.required}
	 */
	public override readonly required = schemaStatics.required;

	/**
	 * {@inheritDoc SchemaStatics.optionalRecursive}
	 */
	public override readonly optionalRecursive = schemaStatics.optionalRecursive;

	/**
	 * {@inheritDoc SchemaStatics.requiredRecursive}
	 */
	public override readonly requiredRecursive = schemaStatics.requiredRecursive;

	/**
	 * Define a {@link TreeNodeSchema} for a {@link TreeMapNode}.
	 *
	 * @param name - Unique identifier for this schema within this factory's scope.
	 * @param allowedTypes - The types that may appear as values in the map.
	 * @param options - Additional options for the schema.
	 *
	 * @example
	 * ```typescript
	 * class NamedMap extends factory.map("name", factory.number, {
	 * 	metadata: { description: "A map of numbers" }
	 * }) {}
	 * ```
	 */
	public mapAlpha<
		Name extends TName,
		const T extends ImplicitAnnotatedAllowedTypes,
		const TCustomMetadata = unknown,
	>(
		name: Name,
		allowedTypes: T,
		options?: NodeSchemaOptionsAlpha<TCustomMetadata>,
	): MapNodeCustomizableSchema<ScopedSchemaName<TScope, Name>, T, true, TCustomMetadata> {
		return mapSchema(
			this.scoped2(name),
			allowedTypes,
			true,
			true,
			options?.metadata,
			options?.persistedMetadata,
		);
	}

	/**
	 * {@inheritDoc SchemaFactory.objectRecursive}
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public override mapRecursive<
		Name extends TName,
		const T extends System_Unsafe.ImplicitAllowedTypesUnsafe,
		const TCustomMetadata = unknown,
	>(name: Name, allowedTypes: T, options?: NodeSchemaOptionsAlpha<TCustomMetadata>) {
		return this.mapAlpha(
			name,
			allowedTypes as T & ImplicitAllowedTypes,
			options,
		) as unknown as MapNodeCustomizableSchemaUnsafe<
			ScopedSchemaName<TScope, Name>,
			T,
			TCustomMetadata
		>;
	}

	/**
	 * Define (and add to this library) a {@link TreeNodeSchemaClass} for a {@link (TreeArrayNode:interface)}.
	 *
	 * @param name - Unique identifier for this schema within this factory's scope.
	 * @param allowedTypes - The types that may appear in the array.
	 * @param options - Additional options for the schema.
	 *
	 * @example
	 * ```typescript
	 * class NamedArray extends factory.arrayAlpha("name", factory.number) {}
	 * ```
	 */
	public arrayAlpha<
		const Name extends TName,
		const T extends ImplicitAnnotatedAllowedTypes,
		const TCustomMetadata = unknown,
	>(
		name: Name,
		allowedTypes: T,
		options?: NodeSchemaOptionsAlpha<TCustomMetadata>,
	): ArrayNodeCustomizableSchema<ScopedSchemaName<TScope, Name>, T, true, TCustomMetadata> {
		return arraySchema(
			this.scoped2(name),
			allowedTypes,
			true,
			true,
			options?.metadata,
			options?.persistedMetadata,
		);
	}

	/**
	 * {@inheritDoc SchemaFactory.objectRecursive}
	 */
	// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
	public override arrayRecursive<
		const Name extends TName,
		const T extends System_Unsafe.ImplicitAllowedTypesUnsafe,
		const TCustomMetadata = unknown,
	>(name: Name, allowedTypes: T, options?: NodeSchemaOptionsAlpha<TCustomMetadata>) {
		return this.arrayAlpha(
			name,
			allowedTypes as T & ImplicitAllowedTypes,
			options,
		) as unknown as ArrayNodeCustomizableSchemaUnsafe<
			ScopedSchemaName<TScope, Name>,
			T,
			TCustomMetadata
		>;
	}

	/**
	 * Create a {@link SchemaFactory} with a {@link SchemaFactory.scope|scope} which is a combination of this factory's scope and the provided name.
	 * @remarks
	 * The main use-case for this is when creating a collection of related schema (for example using a function that creates multiple schema).
	 * Creating such related schema using a sub-scope helps ensure they won't collide with other schema in the parent scope.
	 */
	public scopedFactory<const T extends TName, TNameInner extends number | string = string>(
		name: T,
	): SchemaFactoryAlpha<ScopedSchemaName<TScope, T>, TNameInner> {
		return new SchemaFactoryAlpha(this.scoped2(name));
	}
}
