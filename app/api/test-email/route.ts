import { Resend } from 'resend'

export async function GET() {
  const resend = new Resend('re_N8LsEXXq_GE7J444xiXkHjRyxWwgZNgS1')
  const { data, error } = await resend.emails.send({
    from: 'Khepria <onboarding@resend.dev>',
    to: 'adria.gaitan.sola@gmail.com',
    subject: 'Test email Khepria',
    html: '<h1>Email funcionando ✅</h1>',
  })
  return Response.json({ data, error })
}
