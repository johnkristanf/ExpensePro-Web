export const isHTML = (content: string): boolean => {
  return /<[a-z][\s\S]*>/i.test(content.trim());
};
