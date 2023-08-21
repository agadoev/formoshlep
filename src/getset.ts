import * as R from 'ramda'

import type { FieldPath, FieldPathValue, FieldValues } from './path'

const isKey = (value: string): boolean => /^\w*$/.test(value);

const compact = <TValue>(value: TValue[]): TValue[] => Array.isArray(value) ? value.filter(Boolean) : [];

const stringToPath = (input: string): string[] =>
  compact(input.replace(/["|']|\]/g, '').split(/\.|\[/));

const set = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>
  (object: TFieldValues, path: TName, value: FieldPathValue<TFieldValues, TName>): TFieldValues => {
      const tempPath = isKey(path) ? [path] : stringToPath(path);
      return R.set<TFieldValues, FieldPathValue<TFieldValues, TName>>(R.lensPath(tempPath), value, object)
    }

const get = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>
  (object: TFieldValues, path: TName): FieldPathValue<TFieldValues, TName> =>
    R.view<TFieldValues, FieldPathValue<TFieldValues, TName>>(
      R.lensPath(
        isKey(path)
          ? [path]
          : stringToPath(path)),
        object)

export {
  set,
  get
}