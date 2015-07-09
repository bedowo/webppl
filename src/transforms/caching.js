'use strict';

var _ = require('underscore');

var Syntax = require('estraverse').Syntax;
var replace = require('estraverse').replace;
var build = require('ast-types').builders;
var types = require('ast-types').types;
var isPrimitive = require('../syntax').isPrimitive;


// TODO: Auto-extract this list, somehow?
var cacheExempt = [
  'flip',
  'randomInteger',
  'discrete',
  'gaussian',
  'uniform',
  'uniformDraw',
  'dirichlet',
  'poisson',
  'binomial',
  'beta',
  'exponential',
  'gamma',
  'factor',
  'sample',
  'sampleWithFactor'
];
var cacheExemptTable = {};
_.each(cacheExempt, function(erpname) {
  cacheExemptTable[erpname] = true;
});
cacheExempt = cacheExemptTable;

function shouldCache(callee) {
  // Don't cache 'primitive' functions. It actually could be benficial to cache
  //    these in some cases, but correctly binding 'this' will require some
  //    systemic changes that I don't want to deal with right now.
  if (isPrimitive(callee))
    return false;
  // Don't cache ERPs or other coroutine functions that deal with ERPs.
  // Why do this? If the cache adaptation decides to remove one of these functions,
  //    then that function will have the same address as the ERP it's dealing with,
  //    so the adapter will also try to remove the ERP.
  // Basically, a core assumption of IncrementalMH is that all cache nodes have unique
  //    addresses.
  if (callee.type === Syntax.Identifier && cacheExempt[callee.name])
    return false;
  // Otherwise, go ahead
  return true;
}

function exit(node) {
  switch (node.type) {
    case Syntax.CallExpression:
      if (shouldCache(node.callee)) {
        return build.callExpression(
            build.identifier('incrementalize'),
            [node.callee, build.arrayExpression(node.arguments)]
        );
      }
    default:
  }
}

function cachingMain(node) {
  return replace(node, { leave: exit });
}

module.exports = {
  caching: cachingMain
};
