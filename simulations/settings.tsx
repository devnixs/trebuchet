import * as React from "react";
import { Formik } from "formik";
import { TextInput } from "./components/TextInput";
import { TrebuchetSettings } from "./trebuchet-objects";
import { defaultTrebuchetSettings, trebuchetSettingsSchema } from "./default-settings";

interface Props {
  onSubmit: (s: TrebuchetSettings) => void;
}

export class Settings extends React.Component<Props> {
  render() {
    return (
      <Formik<TrebuchetSettings>
        initialValues={defaultTrebuchetSettings}
        validationSchema={trebuchetSettingsSchema}
        onSubmit={(values, actions) => {
          this.props.onSubmit(values);
        }}
      >
        {props => (
          <form onSubmit={props.handleSubmit}>
            <h3>Settings</h3>

            <TextInput name="lengthOfShortArm" label="Length Of Short Arm" />
            <TextInput name="lengthOfLongArm" label="Length Of Long Arm" />
            <TextInput name="heightOfPivot" label="Height Of Pivot" />
            <TextInput name="counterWeightMass" label="Counter Weight Mass" />
            <TextInput name="counterweightRadius" label="Counter weight Radius" />
            <TextInput name="counterWeightLength" label="Counter weight Length" />
            <TextInput name="armMass" label="Arm Mass" />
            <TextInput name="armWidth" label="Arm Width" />
            <TextInput name="projectileMass" label="Projectile Mass" />
            <TextInput name="projectileRadius" label="Projectile Radius" />
            <TextInput name="slingLength" label="Sling Length" />

            <div className="text-right">
              <button className="btn btn-primary" type="submit">
                Run
              </button>
            </div>
          </form>
        )}
      </Formik>
    );
  }
}
