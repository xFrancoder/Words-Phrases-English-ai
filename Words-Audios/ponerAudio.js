const fs = require('fs');

const FILE_PATH = './data.json'; // cambia el nombre si tu json se llama distinto

try {
  // leer el json
  const fileContent = fs.readFileSync(FILE_PATH, 'utf8');
  const data = JSON.parse(fileContent);

  // verificar que sea un array
  if (!Array.isArray(data)) {
    throw new Error('El JSON debe ser un array de objetos');
  }

  // modificar solo la propiedad audio
  data.forEach((item) => {
    if (item && typeof item.id !== 'undefined') {

      item.audio = `![[1-${item.id}.mp3]]`;
    }
  });

  // sobrescribir el mismo archivo
  fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2), 'utf8');

  console.log('Audio actualizado correctamente.');
} catch (error) {
  console.error('Error:', error.message);
}