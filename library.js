// 在之前查看的extended-markdown-fixed插件中，检查是否有@符号相关处理
const colorRegex = /(<code.*?>.*?<\/code>)|%\((#[\dA-Fa-f]{6}|rgb\(\d{1,3}, ?\d{1,3}, ?\d{1,3}\)|[a-z]+)\)\[(.+?)]/g; 