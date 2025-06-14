const config = {
  base: import.meta.env.DEV ? "http://localhost:8000" : location.origin,
  HEADER: {
    CONTENT_JSON: { "Content-Type": "application/json" },
  },
};

export default config;
