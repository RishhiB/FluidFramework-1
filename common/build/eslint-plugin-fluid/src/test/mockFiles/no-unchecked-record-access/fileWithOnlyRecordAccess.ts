/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */

const record = { a: 1, b: 2 };
const recordA = record.a; // ok: Accessing number property 'a' directly
const recordB = record.b; // ok: Accessing number property 'b' directly

interface NestedIndexProps {
	nested: {
		[key: string]: string;
	};
}
type StaticType = { a: string; b: string };
type IndexSignatureType = { [key: string]: string };

const nestedObj: NestedIndexProps = { nested: { a: "hello" } };
nestedObj.nested.a; // ok: Accessing nested index property 'a' without requiring a particular result
nestedObj.nested.a.length; // defect: Accessing length of a nested possibly undefined or missing property

const a = "a";
const b = "b";
const c = "c";
const someObjWithStaticType: StaticType = { a: "hello", b: "goodbye" };
someObjWithStaticType.a; // ok: Accessing string property 'a'
someObjWithStaticType.a.length; // ok: Accessing length of string property 'a'
someObjWithStaticType["a"]; // ok: Accessing property 'a' using bracket notation
someObjWithStaticType["a"].length; // ok: Accessing length of string property 'a' using bracket notation
someObjWithStaticType[a].length; // ok: Accessing length of string property 'a' using bracket notation
someObjWithStaticType[b].length; // ok: Accessing length of string property 'b' using bracket notation
const aExpectingStringFromStaticType: string = someObjWithStaticType.a; // ok: Assigning string property to a strict string variable
const aExpectingStringOrUndefinedFromStaticType: string | undefined = someObjWithStaticType.a; // ok: Assigning string property to a string or undefined variable

const indexedRecordOfStrings: IndexSignatureType = someObjWithStaticType;
indexedRecordOfStrings.a; // ok: Accessing index property 'a' without requiring a particular result
indexedRecordOfStrings.a.length; // defect: Accessing length of index property 'a', but 'a' might not be present
indexedRecordOfStrings["a"]; // ok: Accessing property 'a' using bracket notation
indexedRecordOfStrings["a"].length; // defect: Accessing length of index property 'a' using bracket notation, but 'a' might not be present
indexedRecordOfStrings[a].length; // defect: Accessing length of index property 'a' using bracket notation, but 'a' might not be present
indexedRecordOfStrings[b].length; // defect: Accessing length of index property 'b' using bracket notation, but 'b' might not be present
indexedRecordOfStrings.a?.length; // ok: Using optional chaining to access length safely handles 'undefined'
indexedRecordOfStrings.a!.length; // ok: The author says they understand the question raised by check and acknowledge that they have other information expecting that it is actually defined or that they are okay with an exception being raise here if "a" is not present and defined
indexedRecordOfStrings["a"]?.length; // ok: Using optional chaining to access length using bracket notation safely handles 'undefined'
indexedRecordOfStrings["a"]!.length; // ok: The author says they understand the question raised by check and acknowledge that they have other information expecting that it is actually defined or that they are okay with an exception being raise here if "a" is not present and defined

if (indexedRecordOfStrings.a) {
	indexedRecordOfStrings.a.length; // ok: Within a truthy check, 'a' is guaranteed to be defined
}

if ("a" in indexedRecordOfStrings) {
	indexedRecordOfStrings.a.length; // ok: Accessing length of property inside an 'in' check, 'a' is guaranteed to be defined
}

for (const [key, value] of Object.entries(indexedRecordOfStrings)) {
	value.length; // ok: Object.entries provides only present values
	indexedRecordOfStrings[key]; // ok: Accessing property while looping though records which acts like a `has` property check
	indexedRecordOfStrings[key].length; // ok: Accessing property while looping though records which acts like a `has` property check
}

const aExpectingString: string = indexedRecordOfStrings.a; // defect: Assigning index property 'a' to a strict string variable, but 'a' might not be present
const aExpectingStringOrUndefined: string | undefined = indexedRecordOfStrings.a; // ok: Assigning index property 'a' to string or undefined variable, 'a' might not be present
const aImplicitType = indexedRecordOfStrings.a; // ok: Assigning index property with inferred type
aImplicitType.length; // defect: Accessing length of inferred type, 'a' might be undefined
aImplicitType?.length; // ok: Using optional chaining to access length safely handles 'undefined'
aImplicitType!.length; // ok: The author says they understand the question raised by check and acknowledge that they have other information expecting that it is actually defined or that they are okay with an exception being raise here if "a" is not present and defined

interface NonNullableProps {
	definitelyString: string;
	maybeString?: string;
}

const nonNullObj: NonNullableProps = { definitelyString: "hello" };
nonNullObj.definitelyString.length; // ok: Accessing length of non-nullable property
nonNullObj.maybeString.length; // ok: This should be caught by tsc, not by this custom lint rule

let possiblyUndefined: string | undefined;
possiblyUndefined = nonNullObj.maybeString; // ok: Assigning optional property to variable of type 'string | undefined'