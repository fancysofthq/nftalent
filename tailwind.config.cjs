module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        web3: "rgb(var(--color-web3))",
      },
    },
  },
  separator: "_",
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/colors/themes")["[data-theme=light]"],
        },
      },
      "dark",
      "dracula"
    ],
    prefix: "daisy-",
  },
};
