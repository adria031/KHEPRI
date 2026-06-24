// Helper compartido para documentos Khepria (PDF + Excel)
// Todos los imports son dinámicos para evitar problemas SSR

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function crearPDF(titulo: string, negocioNombre: string, periodo: string) {
  const { default: jsPDF } = await import('jspdf')
  await import('jspdf-autotable')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const mL = 14, mR = 196

  // Cabecera violeta Khepria
  doc.setFillColor(124, 58, 237)
  doc.rect(0, 0, 210, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('Khepria', mL, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Plataforma de gestión para negocios de servicios', mL, 23)
  doc.text('khepria.app', mL, 29)

  doc.text(new Date().toLocaleDateString('es-ES'), mR, 16, { align: 'right' })

  // Título y datos del documento
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, mL, 52)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  if (negocioNombre) doc.text(`Negocio: ${negocioNombre}`, mL, 60)
  if (periodo) doc.text(`Período: ${periodo}`, mL, 66)

  // Línea divisoria violeta
  doc.setDrawColor(124, 58, 237)
  doc.setLineWidth(0.8)
  doc.line(mL, 71, mR, 71)

  return doc
}

export function añadirTablaConEstilo(
  doc: any,
  columnas: string[],
  filas: unknown[][],
  startY = 78
) {
  const fecha = new Date().toLocaleDateString('es-ES')
  doc.autoTable({
    head: [columnas],
    body: filas,
    startY,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [245, 240, 255] },
    columnStyles: { 0: { fontStyle: 'bold' } },
    didDrawPage: (data: { pageNumber: number }) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(180, 180, 180)
      doc.text(
        `khepria.app · Generado el ${fecha} · Página ${data.pageNumber} de ${pageCount}`,
        14, doc.internal.pageSize.height - 8
      )
      doc.text('© 2026 Khepria', 196, doc.internal.pageSize.height - 8, { align: 'right' })
    },
  })
}

export async function crearYDescargarExcel(
  titulo: string,
  negocioNombre: string,
  periodo: string,
  columnas: string[],
  datos: unknown[][],
  filename: string
) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const ws: Record<string, unknown> = {}

  ws['A1'] = { v: 'KHEPRIA', t: 's' }
  ws['A2'] = { v: titulo, t: 's' }
  ws['A3'] = { v: `Negocio: ${negocioNombre}`, t: 's' }
  ws['A4'] = { v: `Período: ${periodo}`, t: 's' }
  ws['A5'] = { v: `Generado: ${new Date().toLocaleDateString('es-ES')}`, t: 's' }
  ws['A6'] = { v: 'khepria.app', t: 's' }
  ws['A7'] = { v: '', t: 's' }

  columnas.forEach((col, i) => {
    ws[`${String.fromCharCode(65 + i)}8`] = { v: col.toUpperCase(), t: 's' }
  })

  datos.forEach((fila, rowIdx) => {
    (fila as unknown[]).forEach((celda, colIdx) => {
      ws[`${String.fromCharCode(65 + colIdx)}${rowIdx + 9}`] = { v: celda ?? '', t: 's' }
    })
  })

  const lastCol = String.fromCharCode(65 + Math.max(columnas.length - 1, 0))
  ws['!ref'] = `A1:${lastCol}${datos.length + 9}`
  ws['!cols'] = columnas.map(() => ({ wch: 22 }))

  XLSX.utils.book_append_sheet(wb, ws, titulo.substring(0, 31))
  XLSX.writeFile(wb, filename)
}
