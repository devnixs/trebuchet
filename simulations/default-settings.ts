import * as Yup from "yup";

export const trebuchetSettingsSchema = Yup.object().shape({
  lengthOfShortArm: Yup.number()
    .min(0.01)
    .required(),
  lengthOfLongArm: Yup.number()
    .min(0.01)
    .required(),
  heightOfPivot: Yup.number()
    .min(0.01)
    .required(),
  counterWeightMass: Yup.number()
    .min(0.01)
    .required(),
  counterweightRadius: Yup.number()
    .min(0.01)
    .required(),
  counterWeightLength: Yup.number()
    .min(0.01)
    .required(),
  armMass: Yup.number()
    .min(0.01)
    .required(),
  armWidth: Yup.number()
    .min(0.01)
    .required(),
  projectileMass: Yup.number()
    .min(0.01)
    .required(),
  projectileRadius: Yup.number()
    .min(0.01)
    .required(),
  slingLength: Yup.number()
    .min(0.01)
    .required()
});

export const defaultTrebuchetSettings = {
  lengthOfShortArm: 1.75,
  lengthOfLongArm: 6.792,
  initialAngle: undefined, // computed so that the arm touches the ground
  heightOfPivot: 5,
  counterWeightMass: 98,
  counterweightRadius: 0.16,
  counterWeightLength: 2,
  armMass: 10.65,
  armWidth: 0.2,
  projectileMass: 0.149,
  projectileRadius: 0.076 / 2,
  slingLength: 6.79
};
