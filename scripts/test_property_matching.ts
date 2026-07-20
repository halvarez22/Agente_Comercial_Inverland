/**
 * Smoke test for PropertyMatchingEngine (in-memory demo catalog).
 * Run: npx tsx scripts/test_property_matching.ts
 */
import { PropertyMatchingEngine } from '../server/infrastructure/engines/PropertyMatchingEngine.js';
import { InMemoryPropertyRepository } from '../server/infrastructure/persistence/PropertyRepository.js';

async function main() {
  const repo = new InMemoryPropertyRepository();
  const engine = new PropertyMatchingEngine(() => repo.getActiveProperties());

  const venta = await engine.search({
    operationType: 'Venta',
    city: 'León',
    maxPrice: 4000000,
    type: 'Casa',
    bedrooms: 3,
    limit: 3,
    relaxMatching: true,
  });
  console.log('=== Venta León Casa ===');
  console.log(venta.message);
  console.log('exact:', venta.exactMatches.map((p) => `${p.title} (${p.priceFormatted})`));
  console.log('nearby:', venta.nearbyAlternatives.map((p) => `${p.title} (${p.matchScore})`));

  const renta = await engine.search({
    operationType: 'Renta',
    city: 'León',
    maxPrice: 15000,
    limit: 3,
    relaxMatching: true,
  });
  console.log('\n=== Renta León ===');
  console.log(renta.message);
  console.log('exact:', renta.exactMatches.map((p) => `${p.title} (${p.priceFormatted})`));

  const noMatch = await engine.search({
    operationType: 'Venta',
    city: 'Cancún',
    maxPrice: 100000,
    type: 'Hacienda',
    bedrooms: 20,
    limit: 3,
    relaxMatching: true,
  });
  console.log('\n=== Sin match exacto (debe ofrecer alternativas) ===');
  console.log(noMatch.message);
  console.log('nearby count:', noMatch.nearbyAlternatives.length);

  const detail = await engine.getById('demo-casa-leon-1');
  console.log('\n=== Detalle activo ===', detail?.title, detail?.publicUrl);

  const missing = await engine.getById('no-existe');
  console.log('=== Detalle inexistente ===', missing);

  console.log('\nOK — PropertyMatchingEngine smoke test passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
