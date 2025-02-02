import { FastifyInstance } from "fastify"
import { z } from 'zod'
import { randomUUID } from "node:crypto"
import { knex } from "../database"
import { checkSessionIdExists } from "../middlewares/check-session-id-exists"

// Testes Unitários: unidade da sua aplicação
// Testes de Integração: comunicação entre duas ou mais unidades
// Testes e2e (ponta a ponta): simulam um usuário operando na aplicação

// Front-end: abre a página de login, digite o texto leonardo@gmail.com no campo com ID email e clique no botão
// Back-end: chamadas HTTP, WebSockets

// Pirâmide de testes: 
// 1. E2E => não dependem de nenhuma tecnologia, não dependem da arquitetura.
// 2. Integração
// 3. Unitários

export async function transactionsRoutes(app: FastifyInstance) {
   app.get('/', {preHandler: [checkSessionIdExists]}, async (request, reply) => {
      const { sessionId } = request.cookies

      const transactions = await knex('transactions')
         .where('session_id', sessionId)
         .select()

      return { transactions }
   })

   app.get('/:id', {preHandler: [checkSessionIdExists]}, async (request) => {
      const getTransactionParamsSchema = z.object({
         id: z.string().uuid()
      })

      const { id } = getTransactionParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const transaction = await knex('transactions')
         .where({
            sessionId: sessionId,
            id
         })
         .first()

      return { transaction }
   })

   app.get('/summary', {preHandler: [checkSessionIdExists]}, async (request) => {
      const { sessionId } = request.cookies

      const summary = await knex('transactions')
         .where('session_id', sessionId)
         .sum('amount', { as: 'amount' })
         .first()

      return { summary }
   })

   app.post('/', async (request, reply) => {
      const createTransactionBodySchema = z.object({
         title: z.string(),
         amount: z.number(),
         type: z.enum(['credit', 'debit'])
      })

      const { title, amount, type } = createTransactionBodySchema.parse(request.body)

      let sessionId = request.cookies.sessionId

      if(!sessionId) {
         sessionId = randomUUID()
         reply.cookie('sessionId', sessionId, {
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 60 seconds * 60 minutes * 24 hours * 7 days = 7 days
         })
      }

      await knex('transactions').insert({
         id: randomUUID(),
         title,
         amount: type === 'credit' ? amount : amount * -1,
         session_id: sessionId
      })

      return reply.status(201).send()
   })
}