/* Minimal, dependency-free JSON reader/writer for the SAM.Agent contract.
 *
 * Only supports the small, fixed shapes used by the Shared Contract:
 * objects, arrays, strings, numbers, booleans and null. It is intentionally
 * small so the agent can target net48/x86 with no external NuGet packages.
 */

using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace SAM.Agent
{
    /// <summary>
    /// Tiny JSON parser/serializer. Parses into object graphs of
    /// <see cref="Dictionary{TKey,TValue}"/> (string keys), <see cref="List{T}"/>,
    /// <see cref="string"/>, <see cref="double"/>, <see cref="bool"/> and null.
    /// </summary>
    internal static class MiniJson
    {
        // Захист від переповнення стека: глибоко вкладене тіло (напр. "[[[[…")
        // інакше кинуло б StackOverflowException, який у .NET НЕ ловиться і
        // вбиває весь процес агента. Через CORS-дірку це був би DoS-вектор.
        private const int MaxDepth = 64;

        #region Parsing

        public static object Parse(string text)
        {
            if (string.IsNullOrEmpty(text))
            {
                return null;
            }

            int index = 0;
            object value = ParseValue(text, ref index, 0);
            SkipWhitespace(text, ref index);
            if (index != text.Length)
            {
                throw new FormatException("Unexpected trailing characters in JSON.");
            }
            return value;
        }

        /// <summary>Convenience: parse and cast to an object (dictionary) or throw.</summary>
        public static Dictionary<string, object> ParseObject(string text)
        {
            if (!(Parse(text) is Dictionary<string, object> obj))
            {
                throw new FormatException("Expected a JSON object.");
            }
            return obj;
        }

        private static object ParseValue(string s, ref int i, int depth)
        {
            if (depth > MaxDepth)
            {
                throw new FormatException("JSON nesting too deep.");
            }

            SkipWhitespace(s, ref i);
            if (i >= s.Length)
            {
                throw new FormatException("Unexpected end of JSON.");
            }

            char c = s[i];
            switch (c)
            {
                case '{': return ParseObjectInternal(s, ref i, depth);
                case '[': return ParseArray(s, ref i, depth);
                case '"': return ParseString(s, ref i);
                case 't':
                case 'f': return ParseBool(s, ref i);
                case 'n': ParseLiteral(s, ref i, "null"); return null;
                default: return ParseNumber(s, ref i);
            }
        }

        private static Dictionary<string, object> ParseObjectInternal(string s, ref int i, int depth)
        {
            var result = new Dictionary<string, object>(StringComparer.Ordinal);
            i++; // consume '{'
            SkipWhitespace(s, ref i);
            if (i < s.Length && s[i] == '}') { i++; return result; }

            while (true)
            {
                SkipWhitespace(s, ref i);
                if (i >= s.Length || s[i] != '"')
                {
                    throw new FormatException("Expected string key in JSON object.");
                }
                string key = ParseString(s, ref i);
                SkipWhitespace(s, ref i);
                if (i >= s.Length || s[i] != ':')
                {
                    throw new FormatException("Expected ':' in JSON object.");
                }
                i++; // consume ':'
                object value = ParseValue(s, ref i, depth + 1);
                result[key] = value;

                SkipWhitespace(s, ref i);
                if (i >= s.Length)
                {
                    throw new FormatException("Unterminated JSON object.");
                }
                if (s[i] == ',') { i++; continue; }
                if (s[i] == '}') { i++; break; }
                throw new FormatException("Expected ',' or '}' in JSON object.");
            }
            return result;
        }

        private static List<object> ParseArray(string s, ref int i, int depth)
        {
            var result = new List<object>();
            i++; // consume '['
            SkipWhitespace(s, ref i);
            if (i < s.Length && s[i] == ']') { i++; return result; }

            while (true)
            {
                object value = ParseValue(s, ref i, depth + 1);
                result.Add(value);

                SkipWhitespace(s, ref i);
                if (i >= s.Length)
                {
                    throw new FormatException("Unterminated JSON array.");
                }
                if (s[i] == ',') { i++; continue; }
                if (s[i] == ']') { i++; break; }
                throw new FormatException("Expected ',' or ']' in JSON array.");
            }
            return result;
        }

        private static string ParseString(string s, ref int i)
        {
            var sb = new StringBuilder();
            i++; // consume opening quote
            while (i < s.Length)
            {
                char c = s[i++];
                if (c == '"')
                {
                    return sb.ToString();
                }
                if (c == '\\')
                {
                    if (i >= s.Length)
                    {
                        break;
                    }
                    char e = s[i++];
                    switch (e)
                    {
                        case '"': sb.Append('"'); break;
                        case '\\': sb.Append('\\'); break;
                        case '/': sb.Append('/'); break;
                        case 'b': sb.Append('\b'); break;
                        case 'f': sb.Append('\f'); break;
                        case 'n': sb.Append('\n'); break;
                        case 'r': sb.Append('\r'); break;
                        case 't': sb.Append('\t'); break;
                        case 'u':
                            if (i + 4 > s.Length)
                            {
                                throw new FormatException("Invalid unicode escape in JSON.");
                            }
                            string hex = s.Substring(i, 4);
                            sb.Append((char)ushort.Parse(hex, NumberStyles.HexNumber, CultureInfo.InvariantCulture));
                            i += 4;
                            break;
                        default:
                            throw new FormatException("Invalid escape character in JSON string.");
                    }
                }
                else
                {
                    sb.Append(c);
                }
            }
            throw new FormatException("Unterminated JSON string.");
        }

        private static bool ParseBool(string s, ref int i)
        {
            if (s[i] == 't')
            {
                ParseLiteral(s, ref i, "true");
                return true;
            }
            ParseLiteral(s, ref i, "false");
            return false;
        }

        private static void ParseLiteral(string s, ref int i, string literal)
        {
            if (i + literal.Length > s.Length ||
                string.CompareOrdinal(s, i, literal, 0, literal.Length) != 0)
            {
                throw new FormatException("Invalid JSON literal, expected '" + literal + "'.");
            }
            i += literal.Length;
        }

        private static double ParseNumber(string s, ref int i)
        {
            int start = i;
            while (i < s.Length && "-+.eE0123456789".IndexOf(s[i]) >= 0)
            {
                i++;
            }
            string token = s.Substring(start, i - start);
            if (!double.TryParse(token, NumberStyles.Float, CultureInfo.InvariantCulture, out double value))
            {
                throw new FormatException("Invalid JSON number: '" + token + "'.");
            }
            return value;
        }

        private static void SkipWhitespace(string s, ref int i)
        {
            while (i < s.Length && char.IsWhiteSpace(s[i]))
            {
                i++;
            }
        }

        #endregion

        #region Serialization

        public static string Serialize(object value)
        {
            var sb = new StringBuilder();
            SerializeValue(value, sb);
            return sb.ToString();
        }

        private static void SerializeValue(object value, StringBuilder sb)
        {
            switch (value)
            {
                case null:
                    sb.Append("null");
                    break;
                case bool b:
                    sb.Append(b ? "true" : "false");
                    break;
                case string str:
                    SerializeString(str, sb);
                    break;
                case IDictionary<string, object> dict:
                    SerializeObject(dict, sb);
                    break;
                case System.Collections.IEnumerable list when !(value is string):
                    SerializeArray(list, sb);
                    break;
                case float f:
                    sb.Append(f.ToString("R", CultureInfo.InvariantCulture));
                    break;
                case double d:
                    sb.Append(d.ToString("R", CultureInfo.InvariantCulture));
                    break;
                default:
                    // Integers and other IFormattable numerics.
                    if (value is IFormattable formattable)
                    {
                        sb.Append(formattable.ToString(null, CultureInfo.InvariantCulture));
                    }
                    else
                    {
                        SerializeString(value.ToString(), sb);
                    }
                    break;
            }
        }

        private static void SerializeObject(IDictionary<string, object> dict, StringBuilder sb)
        {
            sb.Append('{');
            bool first = true;
            foreach (var pair in dict)
            {
                if (!first) { sb.Append(','); }
                first = false;
                SerializeString(pair.Key, sb);
                sb.Append(':');
                SerializeValue(pair.Value, sb);
            }
            sb.Append('}');
        }

        private static void SerializeArray(System.Collections.IEnumerable list, StringBuilder sb)
        {
            sb.Append('[');
            bool first = true;
            foreach (object item in list)
            {
                if (!first) { sb.Append(','); }
                first = false;
                SerializeValue(item, sb);
            }
            sb.Append(']');
        }

        private static void SerializeString(string s, StringBuilder sb)
        {
            sb.Append('"');
            foreach (char c in s)
            {
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\b': sb.Append("\\b"); break;
                    case '\f': sb.Append("\\f"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default:
                        if (c < 0x20)
                        {
                            sb.Append("\\u").Append(((int)c).ToString("x4", CultureInfo.InvariantCulture));
                        }
                        else
                        {
                            sb.Append(c);
                        }
                        break;
                }
            }
            sb.Append('"');
        }

        #endregion

        #region Typed helpers

        public static bool TryGetString(IDictionary<string, object> obj, string key, out string value)
        {
            value = null;
            if (obj != null && obj.TryGetValue(key, out object raw) && raw != null)
            {
                value = raw as string ?? raw.ToString();
                return true;
            }
            return false;
        }

        /// <summary>
        /// Reads an appId that may arrive as a JSON number or a numeric string.
        /// </summary>
        public static bool TryGetAppId(IDictionary<string, object> obj, string key, out long appId)
        {
            appId = 0;
            if (obj == null || !obj.TryGetValue(key, out object raw) || raw == null)
            {
                return false;
            }
            switch (raw)
            {
                case double d:
                    appId = (long)d;
                    return true;
                case string s:
                    return long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out appId);
                default:
                    return long.TryParse(raw.ToString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out appId);
            }
        }

        public static List<string> GetStringList(IDictionary<string, object> obj, string key)
        {
            var result = new List<string>();
            if (obj != null && obj.TryGetValue(key, out object raw) && raw is List<object> list)
            {
                foreach (object item in list)
                {
                    if (item != null)
                    {
                        result.Add(item as string ?? item.ToString());
                    }
                }
            }
            return result;
        }

        #endregion
    }
}
