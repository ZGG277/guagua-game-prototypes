const path=require('path');
exports.load=function(name){try{return require(name)}catch(e){if(name==='esbuild')return require(path.resolve(__dirname,'../../catchball-release/r16-source/node_modules/esbuild'));return require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/'+name)}};
