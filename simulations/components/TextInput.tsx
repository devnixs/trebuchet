import * as React from "react";
import { useFormikContext, useField } from "formik";

interface Props {
  name: string;
  label: string;
}

export const TextInput = (props: Props) => {
  const [field, meta, help] = useField(props.name);
  const [inputId] = React.useState((Math.random() * 100000).toFixed(0));
  return (
    <div className="form-group">
      <label htmlFor={inputId}>{props.label}</label>
      <input type="text" {...field} className="form-control" id={inputId} />
      {meta.error && <small className="form-text text-danger">{meta.error}</small>}
    </div>
  );
};
