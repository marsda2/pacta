import { allow, api, HttpError, uuidParam } from '../../../lib/server/http';
import { proofImage } from '../../../lib/server/pact-engine';

// GET /api/proofs/:id/image → la foto de una prueba guardada en Postgres.
// El id es un UUID aleatorio, no adivinable; cuando haya identidad real se exigirá sesión.
export default api(async (req, res) => {
  allow(req, 'GET');
  const image = await proofImage(uuidParam(req.query.id));
  if (!image) throw new HttpError(404, 'not_found');
  res.setHeader('Content-Type', image.mime);
  res.setHeader('Cache-Control', 'private, max-age=3600');
  return res.status(200).send(image.data);
});
