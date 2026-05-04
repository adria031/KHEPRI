import { Resend } from 'resend'

export async function GET() {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: 'Khepria <onboarding@resend.dev>',
    to: 'khepriacontact@gmail.com',
    subject: 'Test email Khepria',
    html: '<h1>Email funcionando ✅</h1>',
  })
  return Response.json({ data, error })
}
