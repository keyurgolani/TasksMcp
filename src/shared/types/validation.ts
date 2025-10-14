/**
 * Validation types for orchestration layer
 * Provides validation result structures
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  currentValue?: unknown;
  expectedValue?: unknown;
  actionableGuidance?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => ValidationResult;
}

export interface ValidationSchema {
  [fieldName: string]: FieldValidation;
}
