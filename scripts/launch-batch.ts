// Lanza el siguiente lote de apelaciones en Terac (un estudio con el panel de 3 jueces).
//   npm run batch:launch              → simulación: presupuesta el lote en Terac sin gastar nada
//   npm run batch:launch -- --launch  → lo lanza de verdad (gasta saldo de Terac)
//   --force                           → lanza aunque aún no se cumpla el tamaño o la espera mínimos
import { launchBatch } from '../lib/server/appeal-study';
import { APPEAL_BOND_CENTS } from '../lib/shared/rules';

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function main() {
  const args = process.argv.slice(2);
  const result = await launchBatch({ dryRun: !args.includes('--launch'), force: args.includes('--force') });

  console.log(`${result.launched ? 'LANZADO' : 'No se lanza'}: ${result.reason}`);
  if (result.cases) console.log(`  casos en el lote: ${result.cases} · tarea de ${result.minutes} min`);
  if (result.totalCents !== undefined && result.cases) {
    const perCase = result.totalCents / result.cases;
    console.log(`  coste en Terac: ${money(result.totalCents)} (${money(perCase)} por caso)`);
    console.log(`  fianza por apelación: ${money(APPEAL_BOND_CENTS)} → ${perCase <= APPEAL_BOND_CENTS ? 'cubre el coste' : 'NO cubre el coste'}`);
  }
  if (result.studyId) console.log(`  estudio: ${result.studyId}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
