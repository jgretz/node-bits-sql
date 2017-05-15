export const buildPage = args => {
  const page = {};

  if (args.start) {
    page.offset = parseInt(args.start, 10);
  }

  if (args.max) {
    page.limit = parseInt(args.max, 10);
  }

  return page;
};
