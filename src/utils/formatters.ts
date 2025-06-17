import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'

export const formatDate = (dateString: string, formatStr = 'dd/MM/yyyy') => {
  try {
    return format(parseISO(dateString), formatStr)
  } catch {
    return dateString
  }
}

export const getRelativeDate = (dateString: string) => {
  const date = parseISO(dateString)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return 'Overdue'
  return formatDate(dateString)
}

export const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-AU', { 
    style: 'currency', 
    currency: 'AUD' 
  }).format(amount)

export const formatFileSize = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Bytes'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

export const truncateText = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.substring(0, maxLength)}...` : text