
export function add(
  first,
  second
) {
  return first + second;
}

export function greet(
  name
) {
  if (!name) {
    return "Guest";
  }

  return `Hello ${name}`;
}