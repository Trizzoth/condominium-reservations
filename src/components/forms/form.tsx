"use client";

import * as React from "react";
import * as Slot from "@radix-ui/react-slot";
import { Controller, ControllerProps, FieldPath, FieldValues, UseFormControllerReturn, UseFormRegisterReturn, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
  name: TName;
  error?: string;
}

const FormFieldContext = React.createContext<FormFieldContextValue | undefined>(undefined);

export function useFormField() {
  const fieldContext = React.useContext(FormFieldContext);
  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }
  const { name, error } = fieldContext;
  const formContext = useFormContext();
  const formField = formContext?.getFieldState(name, formContext.formState);
  const fieldState = formField || { error: undefined, invalid: false, dirty: false };
  return { fieldContext, formContext, fieldState };
}

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit?: (data: any) => void;
}

export const Form = ({ onSubmit, children, ...props }: FormProps) => {
  return <form onSubmit={onSubmit} {...props}>{children}</form>;
};

export interface FormFieldProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
  name: TName;
  children: (props: { field: UseFormControllerReturn<TFieldValues, TName>; fieldState: { error?: string; invalid: boolean; dirty: boolean }; formContext: any }) => React.ReactNode;
}

export const FormField = <TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  name,
  children,
}: FormFieldProps<TFieldValues, TName>) => {
  const formContext = useFormContext();
  const fieldState = formContext?.getFieldState(name, formContext.formState) || { error: undefined, invalid: false, dirty: false };
  const error = fieldState.error?.message;
  return (
    <FormFieldContext.Provider value={{ name, error }}>
      {children({ field: formContext?.control?.controller({ name, rules: { required: true } }) as any, fieldState, formContext })}
    </FormFieldContext.Provider>
  );
};

export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
);
FormItem.displayName = "FormItem";

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, ...props }, ref) => (
    <Label ref={ref} className={cn("", className)} {...props} />
  )
);
FormLabel.displayName = "FormLabel";

export interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {}

export const FormControl = React.forwardRef<HTMLDivElement, FormControlProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
FormControl.displayName = "FormControl";

export interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
);
FormDescription.displayName = "FormDescription";

export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, ...props }, ref) => {
    const { fieldState } = useFormField();
    const error = fieldState.error;
    if (!error) return null;
    return (
      <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
        {error}
      </p>
    );
  }
);
FormMessage.displayName = "FormMessage";

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, ...props }, ref) => {
    const { fieldContext, fieldState } = useFormField();
    const error = fieldState.error?.message;
    return (
      <Input
        ref={ref}
        className={cn("", className)}
        aria-invalid={fieldState.invalid}
        aria-describedby={error ? `${fieldContext.name}-error` : undefined}
        {...props}
      />
    );
  }
);
FormInput.displayName = "FormInput";

export { useFormField };