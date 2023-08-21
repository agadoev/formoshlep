import { createEvent, createStore } from "effector";

import { type Path, type FieldValues, type FieldPathValue, type FieldPath } from "./path";
import { get, set } from './getset'

type Error = 
    | 'empty'
    | 'max-length-exceeded'
    | 'min-length-exceeded'
    | 'not-a-number'
    | 'too-low'
    | 'too-large'
    | 'ok'

type FieldRule = {
  required: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  type: "string" | "number" | "boolean"
  pattern?: RegExp
}

type FieldRules<T> = Readonly<Partial<Record<Path<T>, FieldRule>>>

type FieldErrors<T> = Partial<Record<Path<T>, Error>>

type FormRules<T> = {
  fieldLevel: FieldRules<T>,
  skipValidation: Array<SkipValidationRule<T>>
}

type SkipValidationRule<T> = {
  for: Array<Path<T>>
  when: (form: Form<T>) => boolean
}

type Form<T> = {
  watch: T
  errors: FieldErrors<T>
  rules: Readonly<FormRules<T>>
}

const shouldSkip = <T>(path: Path<T>, rules: FormRules<T>, form: Form<T>): boolean => {
  const rule = rules.skipValidation.find(rule => rule.for.includes(path))

  if (!rule) {
    return false
  }

  return rule.when(form)
}

const isValid = <T>(form: Form<T>): boolean =>
  Object.values(form.errors).every(e => e === undefined)

const onBlur = <
  T extends FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
>(form: Form<T>, path: TName): Form<T> => {
  const rules = form.rules;
  const field = get(form.watch, path)
  const rule = rules.fieldLevel[path]

  if (!rule) {
    return form
  }

  if (shouldSkip(path as Path<T>, rules, form)) {
    return form
  }

  const validation = _validate(field, rule)

  const newErrors = {...form.errors}

  newErrors[path] = validation === 'ok' ? undefined : validation

  return {
    watch: form.watch,
    errors: newErrors,
    rules
  }
}

const onChange = <
  T extends FieldValues,
  TName extends FieldPath<T> = FieldPath<T>,
>(form: Form<T>, path: TName, value: FieldPathValue<T, TName>): Form<T> => ({
  errors: form.errors,
  watch: set(form.watch, path, value),
  rules: form.rules
})

const _validate = (value: string , rule: FieldRule):Error => {
  if (rule.required && (value === undefined || value === '')) {
    return 'empty'
  }

  if (rule.type === 'string' && rule.maxLength && value.length > rule.maxLength) {
    return 'max-length-exceeded'
  }

  if (rule.type === 'string' && rule.minLength && value.length < rule.minLength) {
    return 'min-length-exceeded'
  }

  if (rule.type === 'number' && isNaN(Number(value))) {
    return 'not-a-number'
  }

  if (rule.type === 'number' && rule.max && Number(value) > rule.max) {
    return 'too-large'
  }

  if (rule.type === 'number' && rule.min && Number(value) < rule.min) {
    return 'too-low'
  }

  return 'ok'
}

const validate = <
  T extends Record<string, any>,
>(form: Form<T>): Form<T> => {
  const rules = form.rules;
  // eslint-disable-next-line functional/no-let
  let errors: FieldErrors<T> = {}

  // eslint-disable-next-line functional/no-loop-statements
  for(const path in rules.fieldLevel) {
    const value = get(form.watch, path as Path<T>)
    const validation = _validate(value, rules.fieldLevel[path as Path<T>] as FieldRule)

    if (shouldSkip(path as Path<T>, rules, form)) {
      continue
    }

    const newErrors = {... errors}

    // @ts-ignore
    newErrors[path] = validation === 'ok' ? undefined : validation

    errors = newErrors
  }

  return { watch: form.watch, errors, rules }
}

/* eslint-disable-next-line @typescript-eslint/explicit-function-return-type */
const createForm = <
  T extends Record<string, any>,
  TName extends FieldPath<T> = FieldPath<T>,
>(initial: T, rules: FormRules<T>) => {

  const fieldBlurred = createEvent<{ path: TName }>()
  const fieldChanged = createEvent<{ path: TName, value: FieldPathValue<T, TName> }>()
  const fill = createEvent<T>()
  const submit = createEvent<void>()

  const $state = createStore<Form<T>>({ watch: initial, rules, errors: {} })
    .on(fieldChanged, (form, { path, value }) => onChange(form, path, value))
    .on(fieldBlurred, (form, { path }) => onBlur(form, path))
    .on(fill, (form, newForm) => ({ ...form, watch: newForm, errors: {} }))
    .on(submit, validate)

  return {
    $state,
    fieldBlurred,
    fieldChanged,
    submit,
    fill
  }
}

export {
  createForm,
  isValid,
  validate,
  type Form
}