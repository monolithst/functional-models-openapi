import merge from 'lodash/merge.js'
import { DataDescription, ModelType } from 'functional-models'
import { ZodType, z } from 'zod'

const _checkAB = (check: boolean, a: any, b: any) => {
  return check ? a : b
}

const _isWrapperType = (
  explicitType: string | undefined,
  typeString: string | undefined
) => {
  return (
    explicitType === 'ZodOptional' ||
    explicitType === 'ZodNullable' ||
    explicitType === 'ZodDefault' ||
    typeString === 'optional' ||
    typeString === 'nullable' ||
    typeString === 'nullish' ||
    typeString === 'default'
  )
}

const _getInnerType = (defRef: any) => {
  return (
    defRef.innerType ||
    defRef.type ||
    defRef.schema ||
    defRef.payload ||
    defRef.value ||
    defRef.inner ||
    (defRef._def && (defRef._def.inner || defRef._def.type)) ||
    (defRef && defRef.innerType)
  )
}

const _unwrapOnce = (s: any) => {
  const defRef = s && (s._def || s.def)
  if (!defRef) {
    return s
  }
  const explicitType =
    defRef && defRef.typeName ? String(defRef.typeName) : undefined
  const typeString =
    !explicitType && defRef && typeof defRef.type === 'string'
      ? String(defRef.type)
      : undefined
  const isWrapper = _isWrapperType(explicitType, typeString)
  if (!isWrapper) {
    return s
  }
  return _getInnerType(defRef) || s
}

const _recursion = (s: any): any => {
  const next = _unwrapOnce(s)
  return next === s ? s : _recursion(next)
}

export const modelToOpenApi = <
  TData extends DataDescription,
  TModel extends ModelType<TData>,
>(
  model: TModel
) => {
  const zodSchema: any = model.getModelDefinition().schema
  const modelProps = (model.getModelDefinition() as any).properties || {}
  const propConfigMap: Record<string, any> = Object.keys(modelProps).reduce(
    (acc: Record<string, any>, k) =>
      merge(acc, {
        [k]: merge(modelProps[k].getConfig ? modelProps[k].getConfig() : {}, {
          propertyType: modelProps[k].getPropertyType
            ? modelProps[k].getPropertyType()
            : undefined,
        }),
      }),
    {}
  )

  const unwrap = (schema: ZodType<any>): ZodType<any> => {
    // Functional recursive unwrapping of common Zod wrappers.
    return _recursion(schema) as ZodType<any>
  }

  // --- small helpers extracted to reduce complexity ---
  const getTypeName = (defRef: any) => {
    if (!defRef) {
      return ''
    }
    if (typeof defRef.type === 'string') {
      return (
        'Zod' +
        String(defRef.type).charAt(0).toUpperCase() +
        String(defRef.type).slice(1)
      )
    }
    if (defRef.typeName) {
      return String(defRef.typeName)
    }
    return ''
  }

  const extractStringBounds = (defRef: any, s: any) => {
    const checks =
      (defRef && defRef.checks) || (s && s._def && (s._def as any).checks) || []
    return Array.isArray(checks)
      ? checks.reduce(
          (acc: { min?: number; max?: number }, c: any) => {
            if (!c || typeof c !== 'object') {
              return acc
            }
            const candidateMin =
              (c.kind === 'min' ||
                c.check === 'min' ||
                (c.def && c.def.type === 'min')) &&
              typeof c.value === 'number'
                ? c.value
                : c.def && typeof c.def.minLength === 'number'
                  ? c.def.minLength
                  : undefined
            const candidateMax =
              (c.kind === 'max' ||
                c.check === 'max' ||
                (c.def && c.def.type === 'max')) &&
              typeof c.value === 'number'
                ? c.value
                : c.def && typeof c.def.maxLength === 'number'
                  ? c.def.maxLength
                  : undefined
            return {
              min: candidateMin !== undefined ? candidateMin : acc.min,
              max: candidateMax !== undefined ? candidateMax : acc.max,
            }
          },
          {} as { min?: number; max?: number }
        )
      : {}
  }

  const getCandidateMin = (c: any) => {
    return (c.kind === 'min' ||
      c.check === 'min' ||
      (c.def && c.def.type === 'min')) &&
      typeof c.value === 'number'
      ? c.value
      : c.def && typeof c.def.minValue === 'number'
        ? c.def.minValue
        : undefined
  }

  const getCandidateMax = (c: any) => {
    return (c.kind === 'max' ||
      c.check === 'max' ||
      (c.def && c.def.type === 'max')) &&
      typeof c.value === 'number'
      ? c.value
      : c.def && typeof c.def.maxValue === 'number'
        ? c.def.maxValue
        : undefined
  }

  const isIntegerCheck = (c: any, acc: { isInteger?: boolean }) => {
    return (
      acc.isInteger ||
      (c &&
        (c.kind === 'int' ||
          c.check === 'int' ||
          c === 'int' ||
          JSON.stringify(c).includes('int')))
    )
  }

  const extractNumberInfo = (defRef: any, s: any) => {
    const checks =
      (defRef && defRef.checks) || (s && s._def && (s._def as any).checks) || []
    return Array.isArray(checks)
      ? checks.reduce(
          (
            acc: { min?: number; max?: number; isInteger?: boolean },
            c: any
          ) => {
            if (!c || typeof c !== 'object') {
              return acc
            }
            const candidateMin = getCandidateMin(c)
            const candidateMax = getCandidateMax(c)
            const isInt = isIntegerCheck(c, acc)
            return {
              min: candidateMin !== undefined ? candidateMin : acc.min,
              max: candidateMax !== undefined ? candidateMax : acc.max,
              isInteger: isInt,
            }
          },
          {} as { min?: number; max?: number; isInteger?: boolean }
        )
      : {}
  }

  const getLiteralOpenApi = (defRef: any, s: any) => {
    const candidates = [
      defRef && (defRef.value !== undefined ? defRef.value : undefined),
      defRef &&
        defRef._def &&
        (defRef._def.value !== undefined ? defRef._def.value : undefined),
      s && s._def && (s._def.value !== undefined ? s._def.value : undefined),
      (s as any) && (s as any).value,
    ]
    const val: any = candidates.find((c: any) => c !== undefined)
    const t = typeof val
    if (t === 'string') {
      return { type: 'string', enum: [val] }
    }
    /*
    if (t === 'number') {
      return { type: 'number', enum: [val] }
    }
    if (t === 'boolean') {
      return { type: 'boolean', enum: [val] }
    }
      */
    return { enum: [val] }
  }

  const getEnumValues = (defRef: any, s: any) => {
    const candidates = [
      s && (s as any)._def && (s as any)._def.values,
      s && (s as any)._def && (s as any)._def.options,
      (s as any).values,
      (s as any).options,
      defRef && defRef.values,
      defRef && defRef.options,
      defRef && defRef._def && defRef._def.values,
      defRef && defRef._def && defRef._def.options,
    ]
    const found = candidates.find((c: any) => Array.isArray(c) && c.length > 0)
    return Array.isArray(found) ? found : []
  }

  const handleZodObject = (s: any, defRef: any, depth: number) => {
    const asAny = s as any
    const shape: Record<string, ZodType<any>> = asAny &&
    typeof asAny.shape === 'function'
      ? asAny.shape()
      : //: defRef && typeof defRef.shape === 'function'
        //? defRef.shape()
        defRef.shape || defRef.properties || {}
    if (!shape || Object.keys(shape).length === 0) {
      return { type: 'object' }
    }

    const keys = Object.keys(shape || {})
    const getChildDescription = (sChild: any, childSchema: any) => {
      return (
        (sChild &&
          (sChild.description ||
            (sChild._def && sChild._def.description) ||
            (sChild.def && sChild.def.description))) ||
        ((childSchema as any) &&
          (((childSchema as any)._def &&
            (childSchema as any)._def.description) ||
            ((childSchema as any).def && (childSchema as any).def.description)))
      )
    }

    const getWithDescription = (
      childOpen: any,
      modelProp: any,
      descFromDef: any,
      depth: number
    ) => {
      return modelProp && modelProp.description && depth === 0
        ? merge({}, childOpen, { description: modelProp.description })
        : descFromDef
          ? merge({}, childOpen, { description: descFromDef })
          : childOpen
    }

    const getAdjustedProperties = (modelProp: any, withDesc: any) => {
      return modelProp
        ? withDesc &&
          (withDesc.type === 'number' || withDesc.type === 'integer')
          ? merge(
              {},
              withDesc,
              typeof modelProp.minValue === 'number'
                ? { minimum: modelProp.minValue }
                : {},
              typeof modelProp.maxValue === 'number'
                ? { maximum: modelProp.maxValue }
                : {}
            )
          : withDesc && withDesc.type === 'string'
            ? merge(
                {},
                withDesc,
                typeof modelProp.minLength === 'number'
                  ? { minimum: modelProp.minLength }
                  : {},
                typeof modelProp.maxLength === 'number'
                  ? { maximum: modelProp.maxLength }
                  : {}
              )
            : withDesc
        : withDesc
    }

    const _getRequired = (childTypeName: string, acc: any, key: string) => {
      return childTypeName !== 'ZodOptional' &&
        childTypeName !== 'ZodNullable' &&
        childTypeName !== 'ZodDefault'
        ? (acc.required || []).concat(key)
        : acc.required || []
    }

    const _getChildTypeName = (childDef: any) => {
      return (
        'Zod' + childDef.type.charAt(0).toUpperCase() + childDef.type.slice(1)
      )
    }

    const handleChildSchema = (
      key: string,
      childSchema: any,
      depth: number,
      acc: any
    ) => {
      const childOpen = zodToOpenApi(childSchema, depth + 1) || {}
      const sChild = unwrap(childSchema) as any
      const descFromDef = getChildDescription(sChild, childSchema)
      const modelProp =
        propConfigMap && propConfigMap[key] ? propConfigMap[key] : undefined

      const withDesc = getWithDescription(
        childOpen,
        modelProp,
        descFromDef,
        depth
      )

      const childIsEmptyObject =
        withDesc &&
        withDesc.type === 'object' &&
        (!withDesc.properties ||
          Object.keys(withDesc.properties).length === 0) &&
        !withDesc.additionalProperties

      if (
        (!withDesc ||
          Object.keys(withDesc).length === 0 ||
          childIsEmptyObject) &&
        modelProp &&
        modelProp.propertyType === 'Object'
      ) {
        const newProp = _checkAB(
          modelProp.required,
          { type: 'object' },
          { type: 'object', nullable: true }
        )
        return {
          properties: merge(acc.properties, { [key]: newProp }),
          required: _checkAB(
            modelProp.required && depth === 0,
            (acc.required || []).concat(key),
            acc.required || []
          ),
        }
      }

      const adjusted = getAdjustedProperties(modelProp, withDesc)

      const childDef = (childSchema &&
        ((childSchema as any)._def || (childSchema as any).def)) as any
      const childTypeName = _getChildTypeName(childDef)
      const newRequired = _getRequired(childTypeName, acc, key)

      return {
        properties: merge(acc.properties, { [key]: adjusted }),
        required: newRequired,
      }
    }

    const reduced = keys.reduce((acc, key) => {
      const childSchema = shape[key]
      /*
      if (!childSchema) {
        return acc
      }
        */
      return handleChildSchema(key, childSchema, depth, acc)
    }, {})

    const out: any = {
      type: 'object',
      // @ts-ignore
      properties: reduced.properties,
      additionalProperties: false,
    }
    const objectDesc =
      (defRef &&
        ((defRef._def && defRef._def.description) ||
          (defRef.def && defRef.def.description) ||
          defRef.description)) ||
      undefined
    const finalOut = merge(
      {},
      out,
      objectDesc ? { description: objectDesc } : {},
      _checkAB(
        // @ts-ignore
        reduced.required.length && depth === 0,
        // @ts-ignore
        { required: reduced.required },
        {}
      )
    )
    return finalOut
  }

  const handleZodUnion = (s: any, defRef: any) => {
    const options = defRef && defRef.options
    //(defRef._def && defRef._def.options) ||
    //(s && (s._def as any).options))
    const arr = Array.isArray(options) ? options : Object.values(options || {})

    const reduced = arr.reduce(
      (acc, opt: any) => {
        if (!acc.allLiterals) {
          return acc
        }
        const sOpt = unwrap(opt) as any
        const dOpt = (sOpt && (sOpt._def || sOpt.def)) as any
        const optTypeName =
          'Zod' + dOpt.type.charAt(0).toUpperCase() + dOpt.type.slice(1)
        if (optTypeName === 'ZodLiteral' || optTypeName === 'ZodEnum') {
          const candidates = [
            dOpt && (dOpt.value !== undefined ? dOpt.value : undefined),
            dOpt &&
              dOpt._def &&
              (dOpt._def.value !== undefined ? dOpt._def.value : undefined),
            sOpt &&
              sOpt._def &&
              (sOpt._def.value !== undefined ? sOpt._def.value : undefined),
            (sOpt as any) && (sOpt as any).value,
            (opt as any) && (opt as any).options,
          ]
          const val = candidates.find((c: any) => c !== undefined)
          if (val !== '__array__') {
            return {
              allLiterals: true,
              literalValues: acc.literalValues.concat(val),
            }
          }
          return { allLiterals: true, literalValues: acc.literalValues }
        }
        return { allLiterals: false, literalValues: acc.literalValues }
      },
      { allLiterals: true, literalValues: [] as any[] }
    )

    if (reduced.allLiterals && reduced.literalValues.length > 0) {
      const unique = Array.from(new Set(reduced.literalValues))
      const allStrings = unique.every(v => typeof v === 'string')
      if (allStrings) {
        return { type: 'string', enum: unique }
      }
      /*
      if (allNumbers) {
        return { type: 'number', enum: unique }
      }
        */
    }

    const optionTypes = arr.map((opt: any) => {
      const od = opt && ((opt._def || opt.def) as any)
      /*
      if (!od) {
        return undefined
      }
      if (od.typeName) {
        return od.typeName
      }
        */
      if (typeof od.type === 'string') {
        return 'Zod' + od.type.charAt(0).toUpperCase() + od.type.slice(1)
      }
      return undefined
    })

    if (
      optionTypes.includes('ZodDate') ||
      (optionTypes.includes('ZodString') && optionTypes.includes('ZodNumber'))
    ) {
      return { type: 'string' }
    }

    return undefined
  }

  const handleZodString = (defRef: any, s: any) => {
    const reduced = extractStringBounds(defRef, s)
    return merge(
      {},
      { type: 'string' },
      typeof reduced.min === 'number' ? { minimum: reduced.min } : {},
      typeof reduced.max === 'number' ? { maximum: reduced.max } : {}
    )
  }

  const _handleZodArray = (defRef: any, s: any, depth: number) => {
    // Zod stores the item schema in different places depending on version.
    // Prefer candidates that look like Zod schema objects (have _def/def).
    const candidates = [
      defRef.element,
      defRef.inner,
      defRef.schema,
      defRef.type,
      s && s._def && s._def.element,
      s && s._def && s._def.inner,
      s && s._def && s._def.schema,
    ]
    const itemsSchema: any = candidates.find(
      (c: any) => c && typeof c === 'object' && (c._def || c.def)
    )

    // If we didn't find an object schema, but there's a non-object candidate (string), skip it.
    const openItems = itemsSchema ? zodToOpenApi(itemsSchema, depth + 1) : {}

    return { type: 'array', items: openItems }
  }

  const getCandidates = (defRef: any, s: any) => {
    return [
      s && s._def && (s._def as any).valueType,
      s && s._def && (s._def as any).value,
      s && s._def && (s._def as any).type,
      defRef && defRef.valueType,
      defRef && defRef.value,
      defRef && defRef.type,
      defRef && defRef._def && defRef._def.valueType,
      defRef && defRef._def && defRef._def.value,
      defRef && defRef._def && defRef._def.type,
      defRef && defRef._def && defRef._def.element,
      defRef && defRef.element,
    ]
  }

  const _handleZodRecord = (defRef: any, s: any) => {
    const candidates = getCandidates(defRef, s)
    const valueType: any = candidates.find((c: any) => c)
    const resolved =
      valueType &&
      _checkAB(
        valueType._def || valueType.def || typeof valueType === 'object',
        valueType,
        undefined
      )
    return {
      type: 'object',
      additionalProperties: zodToOpenApi(resolved || z.any()),
    }
  }

  const zodToOpenApi = (schema: ZodType<any>, depth = 0): any => {
    const s = unwrap(schema) as any
    const defRef = (s && (s._def || s.def)) as any
    const typeName = getTypeName(defRef)
    switch (typeName) {
      case 'ZodString':
        return handleZodString(defRef, s)
      case 'ZodNumber': {
        const info = extractNumberInfo(defRef, s)
        return merge(
          {},
          { type: _checkAB(info.isInteger, 'integer', 'number') },
          _checkAB(typeof info.min === 'number', { minimum: info.min }, {}),
          _checkAB(typeof info.max === 'number', { maximum: info.max }, {})
        )
      }
      /*
      case 'ZodBigInt':
        return { type: 'integer' }
      */
      case 'ZodBoolean':
        return { type: 'boolean' }
      /*
      case 'ZodDate':
        return { type: 'string', format: 'date-time' }
      */
      case 'ZodLiteral': {
        return getLiteralOpenApi(defRef, s)
      }
      case 'ZodEnum': {
        return { type: 'string', enum: getEnumValues(defRef, s) }
      }
      /*
      case 'ZodNativeEnum': {
        // Native enum extraction - handle array, object map, or _def enum
        const candidates = [
          s && (s as any)._def && (s as any)._def.values,
          s && (s as any)._def && (s as any)._def.options,
          s && (s as any)._def && (s as any)._def.enum,
          (s as any).values,
          (s as any).options,
          defRef && defRef.values,
          defRef && defRef.options,
          defRef && defRef.enum,
          defRef && defRef._def && defRef._def.enum,
        ]
        const raw = candidates.find((c: any) => c !== undefined && c !== null)
        const values = Array.isArray(raw) ? raw : Object.values(raw || {})
        const unique = Array.from(new Set(values))
        // prefer string enums when possible
        const allStrings = unique.every(v => typeof v === 'string')
        return allStrings ? { type: 'string', enum: unique } : { enum: unique }
      }
        */
      case 'ZodArray': {
        return _handleZodArray(defRef, s, depth)
      }
      case 'ZodObject': {
        return handleZodObject(defRef, s, depth)
      }
      case 'ZodUnion': {
        return handleZodUnion(defRef, s)
      }
      case 'ZodRecord': {
        return _handleZodRecord(defRef, s)
      }

      /*
      case 'ZodAny':
      //case 'ZodUnknown':
        */
      default:
        return {}
    }
  }

  // Build top-level schema
  const result = zodToOpenApi(zodSchema)
  // Ensure top-level result is an object schema
  const normalized =
    //!result || result.type !== 'object'
    //  ? { type: 'object', properties: {}, required: [], ...(result || {}) }
    result

  return normalized
}