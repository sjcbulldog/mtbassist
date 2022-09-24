
export function mtbStringToJSON(str: string) : object {
    str = str.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? "" : m);
    return JSON.parse(str) ;
}