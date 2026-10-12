export const isNewCommand = (body: string) => /^\/new(?:@\w+)?\s*$/i.test(body);
export const isStartCommand = (body: string) => /^\/start(?:@\w+)?\s*$/i.test(body);
