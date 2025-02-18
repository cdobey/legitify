import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "blue",
  fontFamily: "Inter, sans-serif",
  defaultRadius: "md",
  components: {
    Container: {
      defaultProps: {
        size: "lg",
      },
    },
  },
});
