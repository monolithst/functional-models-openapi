import { assert } from 'chai'
import { z } from 'zod'
import { 
  Model,
  PrimaryKeyUuidProperty,
  TextProperty,
  IntegerProperty,
  BooleanProperty,
  DateProperty,
  DatetimeProperty,
  EmailProperty,
  NumberProperty,
  ObjectProperty,
  ArrayProperty,
  ModelReferenceProperty,
} from 'functional-models'
import { modelToOpenApi } from '../../src/libs'


describe('/src/libs.ts', () => {
  describe('#modelToOpenApi()', () => {
    it('maps TextProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'TextModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: TextProperty({ description: 'Description of the field', required: true, maxLength: 5, minLength: 2 }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          field: { type: 'string', description: 'Description of the field', maximum: 5, minimum: 2 },
        },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps IntegerProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'IntModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: IntegerProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'integer' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps BooleanProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'BoolModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: BooleanProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'boolean' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps DateProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'DateModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: DateProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'string' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps DatetimeProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'DatetimeModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: DatetimeProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'string' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps EmailProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'EmailModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: EmailProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'string' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps NumberProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'NumberModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          myNumber: NumberProperty({ required: true, minValue: 5, maxValue: 10 }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, myNumber: { type: 'number', minimum: 5, maximum: 10 } },
        required: ['id', 'myNumber'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps ObjectProperty to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'ObjectModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          field: ObjectProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, field: { type: 'object' } },
        required: ['id', 'field'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps ModelReferenceProperty to OpenAPI schema via model', () => {
      const Ref = Model({
        pluralName: 'Refs',
        namespace: 'functional-models-orm-mcp-test',
        properties: { id: PrimaryKeyUuidProperty(), name: TextProperty({}) },
      })
  
      const M = Model({
        pluralName: 'RefModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          ref: ModelReferenceProperty(() => Ref, { required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, ref: { type: 'string' } },
        required: ['id', 'ref'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('allows nullable for non-required ObjectProperty', () => {
      const M = Model({
        pluralName: 'NullableModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          meta: ObjectProperty({}),
          requiredMeta: ObjectProperty({ required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      // Not required: should have nullable true
      assert.deepEqual(actual.properties.meta, { type: 'object', nullable: true })
      // Required: should not have nullable
      assert.deepEqual(actual.properties.requiredMeta, { type: 'object' })
    })
  
    it('parses complex model schema with nested objects, arrays, required and optional properties', () => {
      const Ref = Model({
        pluralName: 'RefsComplex',
        namespace: 'functional-models-orm-mcp-test',
        properties: { id: PrimaryKeyUuidProperty(), name: TextProperty({}) },
      })
  
      const M = Model({
        pluralName: 'ComplexModels',
        namespace: 'functional-models-orm-mcp-test',
        description: 'Complex model description',
        properties: {
          id: PrimaryKeyUuidProperty(),
          title: TextProperty({ description: 'title desc', required: true }),
          counts: ArrayProperty({ zod: z.array(z.number()), required: true }),
          nestedObject: ObjectProperty({
            description: 'nested object desc',
            required: true,
            zod: z
              .object({
                nested: z.string().describe('inner desc'),
                optionalNested: z.number().optional(),
              })
          }),
          ref: ModelReferenceProperty(() => Ref, { required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        description: 'Complex model description',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string', description: 'title desc' },
          counts: { type: 'array', items: { type: 'number' } },
          nestedObject: {
            type: 'object',
            description: 'nested object desc',
            properties: {
              nested: { type: 'string', description: 'inner desc' },
              optionalNested: { type: 'number' },
            },
            additionalProperties: false,
          },
          ref: { type: 'string' },
        },
        required: ['id', 'title', 'counts', 'nestedObject', 'ref'],
      }
  
      assert.deepEqual(actual, expected)
    })
  
    it('maps ZodLiteral to OpenAPI schema via model', () => {
      const M = Model({
        pluralName: 'LiteralModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          lit: TextProperty({ zod: z.literal('X'), required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: { id: { type: 'string' }, lit: { enum: ['X'], type: 'string' } },
        required: ['id', 'lit'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps ZodEnum and ZodNativeEnum to OpenAPI schema via model', () => {
      enum NativeE {
        A = 'a',
        B = 'b',
      }
  
      const M = Model({
        pluralName: 'EnumModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          regular: TextProperty({choices: Object.values(NativeE)}),
          en: TextProperty({ zod: z.enum(['ONE', 'TWO']), required: true }),
          nen: TextProperty({ zod: z.nativeEnum(NativeE) }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      const expected = {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          regular: { type: 'string', enum: ['a', 'b'] },
          en: { type: 'string', enum: ['ONE', 'TWO'] },
          nen: { type: 'string', enum: ['a', 'b'] },
        },
        required: ['id', 'en', 'nen'],
      }
      assert.deepEqual(actual, expected)
    })
  
    it('maps ZodUnion of string|number to string via model', () => {
      const M = Model({
        pluralName: 'UnionModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          u: TextProperty({ zod: z.union([z.string(), z.number()]), required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      assert.deepEqual(actual.properties.u, { type: 'string' })
    })
  
    it('maps ZodRecord to OpenAPI additionalProperties schema', () => {
      const M = Model({
        pluralName: 'RecordModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          map: ObjectProperty({ zod: z.record(z.string(),z.number()), required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      assert.deepEqual(actual.properties.map, { type: 'object', additionalProperties: { type: 'number' } })
    })

    it('maps Array of integer numbers to OpenAPI integer items', () => {
      const M = Model({
        pluralName: 'ArrayIntModels',
        namespace: 'functional-models-orm-mcp-test',
        properties: {
          id: PrimaryKeyUuidProperty(),
          arr: ArrayProperty({ zod: z.array(z.number().int()), required: true }),
        },
      })
  
      const actual = modelToOpenApi(M as any) as any
      assert.deepEqual(actual.properties.arr, { type: 'array', items: { type: 'integer' },
      })
    })
  })
})