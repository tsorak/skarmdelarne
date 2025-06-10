const config = {
  base: import.meta.env.DEV ? "http://v4:8000" : location.origin,
};

export default config;
