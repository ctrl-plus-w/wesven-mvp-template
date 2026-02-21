---
name: react
description: React component conventions and patterns for this project. Use when creating or modifying React components, dialogs, forms, or utility functions.
---

# React Components

1. When a dialog has a form in it, if not needed, do not create a separate component for the form itself. Instead, define the form directly within the dialog component to keep related logic together.
2. In the dialog forms, you must include the main CTA (with an icon) along with a "Cancel" (cancel) button to allow users to easily cancel the action if needed.
3. When implementing an upsert dialog, put the delete action inside the upsert dialog itself instead of creating a separate delete dialog component to streamline the user experience (use the `confirm-delete-dialog.tsx` if needed).
4. Do not import `React` as a global from the `react` library. Import only the necessary hooks or components from `react` as needed.
5. Extends the props with `PropsWithChildren` (from "react") when needed instead of creating a `children` prop.
6. When implemeting a component, if it needs a util function, put in in an appropriate file in the utils folder. Do not put utils functions inside the react components unless other statements tell you to do so.
7. If you create a component to refactor a complex feature, try to make the props match as much as possible the behavior. For example, when creating a "controlled" component for a form, if the props takes the `control` and `name` props, make the type generic and extend `FieldValues`.
8. In the props, if using a onChange property, use `Dispatch<SetStateAction<TYPE>>` instead of a direct function.

### Optional Rules (Only if applicable)

1. When implementing a dialog, create a separate file. Also when possible, use the existing confirm delete dialog component located at `src/components/modules/confirm-delete-dialog.tsx`.
2. In the forms, if the field is required, add the `<RequiredMark />` component next to the field label to indicate that the field is mandatory.
