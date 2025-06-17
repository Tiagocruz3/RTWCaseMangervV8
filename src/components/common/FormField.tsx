import React from 'react'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required,
  children,
  className = ''
}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {required && <span className="text-error-500 ml-1">*</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 text-sm text-error-600">{error}</p>
    )}
  </div>
)

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input: React.FC<InputProps> = ({ error, className = '', ...props }) => (
  <input
    className={`w-full rounded-md border shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500 ${
      error ? 'border-error-300' : 'border-gray-300'
    } ${className}`}
    {...props}
  />
)

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea: React.FC<TextareaProps> = ({ error, className = '', ...props }) => (
  <textarea
    className={`w-full rounded-md border shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500 ${
      error ? 'border-error-300' : 'border-gray-300'
    } ${className}`}
    {...props}
  />
)

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  options: { value: string; label: string }[]
}

export const Select: React.FC<SelectProps> = ({ error, options, className = '', ...props }) => (
  <select
    className={`w-full rounded-md border shadow-sm px-3 py-2 focus:ring-primary-500 focus:border-primary-500 ${
      error ? 'border-error-300' : 'border-gray-300'
    } ${className}`}
    {...props}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
)