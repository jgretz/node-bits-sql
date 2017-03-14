export const buildPage = args => {
  const page = {};

  if (args.start) {
    page.offset = args.start;
  }

  if (args.max) {
    page.limit = args.max;
  }

  return page;
};
