set -e

cd lib/ipft       && npm i && npm run build && cd ../..
cd lib/metabazaar && npm i && npm run build && cd ../..
cd lib/persona    && npm i && npm run build && cd ../..
