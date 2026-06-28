const PROMPT = `
Eres un generador JSON.

Devuelve SOLO JSON válido.

Formato:

{
  "phrase": "string",
  "translation": "string",
  "phoneticSimple": "",
  "children": [
    {
      "phrase": "",
      "translation": "",
      "phoneticSimple": ""
    }
  ],
  "example": "",
  "usage": "
}

children:
- traducir cada child
- generar phoneticSimple para cada child
- usar letras españolas
- no usar IPA

Reglas:
- traducir al español natural
- usar ejemplos simples y naturales
- NO markdown
- NO explicaciones
- devolver JSON puro

example: 
- en english

phoneticSimple:
- pronunciación aproximada usando letras españolas
- no usar IPA
- ejemplo:
  good idea -> gud aidía
  all day -> ol dei

usage:
- en inglés
- entre 3 y 8 palabras
- describir el contexto principal
- no empezar con "Used for"
- no escribir oraciones completas
`;

module.exports = {
  PROMPT,
};