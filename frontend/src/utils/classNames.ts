type ClassValue = string | false | null | undefined;

const classNames = (...classes: ClassValue[]): string => classes.filter(Boolean).join(' ');

export default classNames;
