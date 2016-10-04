"use strict";

var HexstreamSoft = {};

HexstreamSoft.modules = {};
HexstreamSoft.modules.registeredModules = {};

HexstreamSoft.modules.moduleInfo = function (moduleName, options) {
    var moduleInfo = HexstreamSoft.modules.registeredModules[moduleName];
    if (moduleInfo)
        return moduleInfo;
    else
        if (!options || options.mustExist)
            throw Error("Unknown module name \"" + moduleName + "\".");
};

HexstreamSoft.modules.register = function (moduleName, ensureFunction) {
    var existingModule = HexstreamSoft.modules.moduleInfo(moduleName, {mustExist: false});
    if (existingModule)
        throw Error("Module \"" + moduleName + "\" has already been registered.");
    var moduleInfo = {};
    moduleInfo.ensureFunction = ensureFunction;
    moduleInfo.isInitialized = false;
    HexstreamSoft.modules.registeredModules[moduleName] = moduleInfo;
};

HexstreamSoft.modules.ensure = function () {
    var moduleNames = Array.prototype.slice.call(arguments);
    moduleNames.forEach(function (moduleName) {
        var moduleInfo = HexstreamSoft.modules.moduleInfo(moduleName);
        if (!moduleInfo.isInitialized)
        {
            moduleInfo.ensureFunction();
            moduleInfo.isInitialized = true;
        }
    });
};



HexstreamSoft.modules.register("HexstreamSoft.misc", function () {
    function identity (value) {
        return value;
    }

    var upgradeReasonsAlreadyGiven = [];

    function pleaseUpgrade (reason) {
        if (upgradeReasonsAlreadyGiven.indexOf(reason) < 0)
        {
            upgradeReasonsAlreadyGiven.push(reason);
            throw Error("[" + reason + "]" + " Please upgrade to a modern standards-compliant browser such as Google Chrome.");
        }
    }

    HexstreamSoft.misc = {};
    HexstreamSoft.misc.identity = identity;
    HexstreamSoft.misc.pleaseUpgrade = pleaseUpgrade;
});


HexstreamSoft.modules.register("HexstreamSoft.dom", function () {
    function forEachAddedNode (mutationRecords, callback) {
        Array.prototype.forEach.call(mutationRecords, function (record) {
            var addedNodes = record.addedNodes;
            if (addedNodes)
                Array.prototype.forEach.call(addedNodes, callback);
        });
    };

    function nodeOrAncestorSatisfying (node, test) {
        if (test(node))
            return node;
        else
        {
            var parent_element = node.parentElement;
            if (parent_element)
                return nodeOrAncestorSatisfying(parent_element, test);
            else
                return undefined;
        }
    };

    function parseTokens (tokensString) {
        return tokensString.split(" ").filter(HexstreamSoft.misc.identity);
    }

    function matches (node, selectors) {
        // I'm searching on the specific node instead of pre-computing
        // because I worry the method returned might be different for different node types.
        if (node.nodeType !== Node.ELEMENT_NODE)
            return false;
        var matches = node.matches || node.matchesSelector || node.webkitMatchesSelector || node.msMatchesSelector;
        if (!matches)
            HexstreamSoft.meta.pleaseUpgrade("matches");
        return matches.call(node, selectors);
    };


    var TokenList = (function () {
        function TokenList (node, attributeName) {
            var tokenList = this;
            tokenList.node = node;
            tokenList.attributeName = attributeName;
            tokenList.tokens = parseTokens(node.getAttribute(attributeName) || "");
        };

        TokenList.prototype.contains = function (token) {
            this.tokens.indexOf(token) >= 0;
        };

        TokenList.prototype.add = function (token) {
            if (!this.contains(token))
                this.tokens.push(token);
            syncTokensToAttribute(this);
        };

        TokenList.prototype.remove = function (token) {
            var index = this.tokens.indexOf(token);
            if (index >= 0)
                this.tokens.splice(index, 1);
            syncTokensToAttribute(this);
        };

        TokenList.prototype.forEach = function (callback, thisValue) {
            this.tokens.forEach(callback, thisValue);
        };

        function syncTokensToAttribute (tokenList) {
            if (tokenList.tokens.length > 0)
                tokenList.node.setAttribute(tokenList.attributeName, tokenList.tokens.join(" "));
            else
                tokenList.node.removeAttribute(tokenList.attributeName);
        }
        return TokenList;
    })();


    HexstreamSoft.dom = {};
    HexstreamSoft.dom.forEachAddedNode = forEachAddedNode;
    HexstreamSoft.dom.nodeOrAncestorSatisfying = nodeOrAncestorSatisfying;
    HexstreamSoft.dom.parseTokens = parseTokens;
    HexstreamSoft.dom.matches = matches;
    HexstreamSoft.dom.TokenList = TokenList;
});



HexstreamSoft.modules.register("HexstreamSoft.FixLinks", function () {
    function toRelativeURLString (base, target) {
        if (typeof base === "string")
            base = new URL(base);
        if (typeof target === "string")
            target = new URL(target);
        if (base.origin !== target.origin)
            return target.toString();
        var relativePath = [];
        var queryHash = String.prototype.concat.call(target.search || "", target.hash || "");
        base = base.pathname.split("/");
        target = target.pathname.split("/");
        var shortestLength = Math.min(base.length, target.length)
        for (var firstDifferent = 0; firstDifferent < shortestLength; firstDifferent++)
            if (base[firstDifferent] !== target[firstDifferent])
                break;
        var extraBaseComponents = base.length - firstDifferent - 1;
        for (var i = 0; i < extraBaseComponents; i++)
            relativePath.push("..")
        relativePath = relativePath.concat(target.slice(firstDifferent));
        return relativePath.join("/").concat(queryHash);
    }

    var baseURIURL = new URL(document.baseURI);

    var observer = new MutationObserver(function (records) {
        HexstreamSoft.dom.forEachAddedNode(records, function (addedNode) {
            if (addedNode.tagName === "A")
            {
                var url = new URL(addedNode.getAttribute("href"), document.baseURI);
                if (url.protocol === "file:" && url.pathname.slice(-1) === "/")
                {
                    url.pathname = url.pathname + "index.html";
                    addedNode.setAttribute("href", toRelativeURLString(baseURIURL, url));
                }
            }
        });
    });

    observer.observe(document.documentElement, {childList: true, subtree: true});

    HexstreamSoft.FixLinks = {};
    HexstreamSoft.FixLinks.observer = observer;

});



HexstreamSoft.modules.register("HexstreamSoft.ArrowsMadness", function () {

    var directions =
        {
            "⬉":
            {
                className: "prev upwards",
                opposite: "⬊"
            },
            "⬆":
            {
                className: "prev",
                opposite: "⬇",
                downwards: "⬈",
                upwards: "⬉"
            },
            "⬈":
            {
                className: "prev downwards",
                opposite: "⬋"
            },
            "⬋":
            {
                className: "next upwards",
                opposite: "⬈"
            },
            "⬇":
            {
                className: "next",
                opposite: "⬆",
                downwards: "⬊",
                upwards: "⬋"
            },
            "⬊":
            {
                className: "next downwards",
                opposite: "⬉"
            },
        };

    var directionNames = Object.keys(directions);

    function makeLink (direction, target) {
        var link = document.createElement("a");
        link.href = "#" + target;
        link.className = directions[direction].className + " generated";
        link.textContent = direction;
        return link;
    }

    var realNodeToMockNode = {};

    function createMockNode (realNode, parent) {
        var node = {};
        var toUpdate = [realNode];
        realNodeToMockNode[realNode.id] = node;
        node.realNode = realNode;
        node["⬈"] = null;
        node["⬊"] = null;
        if (!parent)
        {
            node["⬉"] = null;
            node["⬋"] = null;
            node["⬆"] = null;
            node["⬇"] = null;
            return toUpdate;
        }
        var siblings = (function () {
            var prev = null;
            var next = parent["⬊"];
            body: while (next)
            {
                if (realNode.compareDocumentPosition(next.realNode) & Node.DOCUMENT_POSITION_FOLLOWING)
                    break body;
                prev = next;
                next = next["⬇"];
            }
            return {prev: prev, next: next};
        })();

        function updateLink (thisNode, otherNode, forward, isReciprocal, whichToUpdate) {
            thisNode[forward] = otherNode;
            if (whichToUpdate === "this")
                toUpdate.push(thisNode.realNode);
            if (otherNode && isReciprocal)
            {
                var backwards = directions[forward].opposite;
                otherNode[backwards] = thisNode;
                if (whichToUpdate === "other")
                    toUpdate.push(otherNode.realNode);
            }
        }

        function updateLinks (sibling, forward) {
            var backwards = directions[forward].opposite;
            var backwardsDownwards = directions[backwards].downwards;
            var backwardsUpwards = directions[backwards].upwards;
            updateLink(node, sibling, forward, true, "other");
            var currentChild = sibling ? sibling[backwardsDownwards] : null;
            while (currentChild)
            {
                var nextChild = currentChild[backwards];
                var currentChildIsLastChild = nextChild === null;
                updateLink(currentChild, node, backwardsUpwards, currentChildIsLastChild, "this");
                currentChild = currentChildIsLastChild ? currentChild[backwardsDownwards] : nextChild;
            }
        }

        var prev = siblings.prev;
        var next = siblings.next;
        updateLink(node, parent, "⬉", prev === null, "other");
        updateLink(node, parent["⬇"], "⬋", next === null, "other");
        updateLinks(prev, "⬆");
        updateLinks(next, "⬇");
        return toUpdate;
    }

    createMockNode(document.documentElement, null);
    var rootMockNode = realNodeToMockNode[""];

    var observer = new MutationObserver(function (records, observer) {
        HexstreamSoft.dom.forEachAddedNode(records, function (addedNode) {
            if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList.contains("section-relative-nav"))
            {
                var isSection = function (node) {return node.tagName === "SECTION";};
                var thisSection = HexstreamSoft.dom.nodeOrAncestorSatisfying(addedNode, isSection);
                var parentSection = HexstreamSoft.dom.nodeOrAncestorSatisfying(thisSection.parentNode, isSection);
                var toUpdate = createMockNode(thisSection, parentSection ? realNodeToMockNode[parentSection.id] : rootMockNode);
                toUpdate.forEach(function (sectionToUpdate) {
                    var navToUpdate = sectionToUpdate.querySelector(".section-relative-nav");
                    var mockNode = realNodeToMockNode[sectionToUpdate.id];
                    var anchor = navToUpdate.querySelector(".section-relative-nav > .anchor");
                    navToUpdate.removeChild(anchor);
                    Array.prototype.forEach.call(navToUpdate.querySelectorAll(".section-relative-nav > .generated"),
                                                 navToUpdate.removeChild,
                                                 navToUpdate);
                    directionNames.forEach(function (type) {
                        var sibling = mockNode[type];
                        if (sibling)
                            navToUpdate.appendChild(makeLink(type, sibling.realNode.id));
                        if (type === "⬈")
                            navToUpdate.appendChild(anchor);
                    });
                });
            }
        });
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});

    HexstreamSoft.ArrowsMadness = {};
    HexstreamSoft.ArrowsMadness.observer = observer;
});



HexstreamSoft.modules.register("HexstreamSoft.StateDomain", function () {
    function StateDomainSchema (properties) {
        var schema = this;
        var keys = Object.keys(properties);
        schema.properties = properties;
        schema.keys = keys;
        schema.varyingRelevanceKeys = schema.keys.filter(function (key) {return !schema.isAlwaysRelevant(key)});
    }

    StateDomainSchema.prototype.defaultValue = function (key) {
        var schema = this;
        var defaultValue = schema.properties[key].defaultValue;
        if (defaultValue !== undefined)
            return defaultValue;
        else
            throw Error("No key named " + key + " in schema " + schema + ".");
    };

    StateDomainSchema.prototype.possibleValues = function (key) {
        var schema = this;
        return schema.properties[key].possibleValues;
    };

    StateDomainSchema.prototype.valueValidator = function (key) {
        var schema = this;
        return schema.properties[key].valueValidator;
    };

    StateDomainSchema.prototype.isAcceptableValue = function (key, value) {
        var schema = this;
        var possibleValues = schema.possibleValues(key);
        return possibleValues ? possibleValues.indexOf(value) >= 0 : (schema.valueValidator(key))(value);
    };

    StateDomainSchema.prototype.isAlwaysRelevant = function (key) {
        var schema = this;
        return schema.properties[key].computeRelevance ? false : true;
    };


    function StateDomain (schema) {
        var domain = this;
        function propagateRelevance () {
            var varyingRelevanceKeys = schema.varyingRelevanceKeys;
            var propagationProgressed = true;
            var propagatedSomething = false;
            while (propagationProgressed)
            {
                propagationProgressed = false;
                varyingRelevanceKeys.forEach(function (key) {
                    var domainKeyProperties = domain.properties[key];
                    var oldRelevance = domainKeyProperties.relevant;
                    var newRelevance = schema.properties[key].computeRelevance(domain);
                    if (newRelevance !== oldRelevance)
                    {
                        domainKeyProperties.relevant = newRelevance;
                        propagationProgressed = true;
                        propagatedSomething = true;
                    }
                });
            }
            if (propagatedSomething)
                window.dispatchEvent(new CustomEvent("HexstreamSoft.relevance",
                                                     {
                                                         bubbles: false,
                                                         cancelable: false,
                                                         detail: {storage: domain}
                                                     }));
        }
        domain.schema = schema;
        domain.properties = {};
        schema.keys.forEach(function (key) {
            domain.properties[key] = {value: schema.defaultValue(key),
                                      relevant: schema.isAlwaysRelevant(key) ? true : false};
            Object.defineProperty(domain, key,
                                  {
                                      set: function (newValue) {
                                          if (schema.isAcceptableValue(key, newValue))
                                          {
                                              var oldValue = domain.properties[key].value;
                                              if (oldValue !== newValue)
                                              {
                                                  domain.properties[key].value = newValue;
                                                  propagateRelevance();
                                                  window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                                                                       {
                                                                                           cancelable: false,
                                                                                           bubbles: false,
                                                                                           detail:
                                                                                           {
                                                                                               storage: domain,
                                                                                               key: key,
                                                                                               oldValue: oldValue,
                                                                                               newValue: newValue,
                                                                                           }
                                                                                       }));
                                              }
                                          }
                                          else
                                              throw Error("Value \"" + newValue + "\" is not acceptable for key \"" + key + "\"."
                                                          + (schema.possibleValues(key)
                                                             ? "\n\nAcceptable values:\n" + schema.possibleValues(key).join("\n")
                                                             : ""));
                                      },
                                      get: function () {
                                          return domain.properties[key].value;
                                      },
                                      enumerable: true
                                  });
        });
        propagateRelevance();
    }

    StateDomain.prototype.forEach = function (callback, thisArg) {
        var domain = this;
        var keys = domain.schema.keys;
        keys.forEach(function (key) {
            callback.call(thisArg, key, domain[key]);
        });
    }

    StateDomain.prototype.isRelevant = function (key) {
        var domain = this;
        return domain.properties[key].relevant;
    };

    StateDomain.prototype.reset = function (key) {
        var domain = this;
        var schema = domain.schema;
        var defaultValue = schema.defaultValue(key);
        domain[key] = defaultValue;
        return defaultValue;
    };

    StateDomain.prototype.resetAll = function () {
        this.schema.keys.forEach(this.reset, this);
    };

    HexstreamSoft.StateDomainSchema = StateDomainSchema;
    HexstreamSoft.StateDomain = StateDomain;

});



HexstreamSoft.modules.register("HexstreamSoft.EventBinding", function () {
    window.addEventListener("storage", function (event) {
        window.dispatchEvent(new CustomEvent("HexstreamSoft.storage",
                                             {
                                                 cancelable: false,
                                                 bubbles: false,
                                                 detail: {
                                                     storage: event.storageArea,
                                                     key: event.key,
                                                     oldValue: event.oldValue,
                                                     newValue: event.newValue,
                                                 }
                                             }));
    });

    var EventBinding = {};

    EventBinding.types = {};

    EventBinding.defineType = function (from, to, definition) {
        var toTable = EventBinding.types[from];
        if (!toTable)
            toTable = EventBinding.types[from] = {};
        if (toTable[to])
            throw Error("Duplicate EventBinding type definition.");
        toTable[to] = definition;
        definition.bindings = [];
    };

    EventBinding.Binding = function (parent) {
        var binding = this;
        binding.parent = parent || null;
        if (parent)
            parent.children.push(binding);
    };

    EventBinding.defineType("storage", "storage", (function () {
        var Binding = function (sourceStorage, keys, destinationStorage) {
            var binding = this;
            binding.sourceStorage = sourceStorage;
            binding.destinationStorage = destinationStorage;
            binding.keys = keys;
            binding.listener = function (event) {
                if (event.detail.storage === sourceStorage)
                    binding.incrementalSync(event.detail.key);
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.listener);
            };
            binding.initialSync = function () {
                binding.keys.forEach(binding.incrementalSync, binding);
            };
            binding.incrementalSync = function (key) {
                var sourceValue = binding.sourceStorage[key];
                if (sourceValue !== undefined)
                    binding.destinationStorage[key] = sourceValue;
            };
        };
        return {
            bind: function (fromSpec, toSpec) {
                return [new Binding(fromSpec.storage, fromSpec.keys, toSpec.storage)];
            },
        }
    })());
    EventBinding.defineType("storage", "document", (function () {
        var Binding = function (storage, document, stateDomainName) {
            var binding = this;
            binding.storage = storage;
            binding.document = document;
            binding.stateDomainName = stateDomainName;
            binding.registeredNodes = [];
            binding.keyToNodes = {};
            binding.storageListener = function (event) {
                if (event.detail.storage === storage)
                    binding.incrementalSync(event.detail.key);
            };
            binding.relevanceListener = function (event) {
                if (event.detail.storage === storage)
                    binding.initialSync();
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.storageListener);
                window.addEventListener("HexstreamSoft.relevance", binding.relevanceListener);
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                        if (HexstreamSoft.dom.matches(node, "input[type=radio], input[type=checkbox]")
                            && node.dataset.stateValue
                            && nodeStateDomainName(node) === stateDomainName)
                        {
                            binding.registeredNodes.push(node);
                            var key = node.dataset.stateKey;
                            var keyNodes = binding.keyToNodes[key];
                            if (!keyNodes)
                            {
                                keyNodes = [];
                                binding.keyToNodes[key] = keyNodes;
                            }
                            keyNodes.push(node);
                            binding.incrementalSyncNode(node);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true});
            };
            binding.initialSync = function () {
                binding.registeredNodes.forEach(function (node) {
                    binding.incrementalSyncNode(node);
                });
            };
            binding.incrementalSyncNode = function (node) {
                var key = node.dataset.stateKey;
                node.disabled = storage.isRelevant ? !storage.isRelevant(key) : false;
                var sourceValue = storage[key];
                if (sourceValue !== undefined)
                    node.checked = sourceValue === node.dataset.stateValue;
            };
            binding.incrementalSync = function (key) {
                (binding.keyToNodes[key] || []).forEach(binding.incrementalSyncNode, binding);
            };
        };
        return {
            bind: function (fromSpec, toSpec) {
                return [new Binding(fromSpec.storage, toSpec.document, toSpec.stateDomainName)];
            },
        }
    })());


    function nodeStateDomainName (node) {
        function nodeStateDomain (node) {
            return node.dataset.stateDomain;
        }
        var domain_node = HexstreamSoft.dom.nodeOrAncestorSatisfying(node, nodeStateDomain);
        var value = domain_node ? nodeStateDomain(domain_node) : undefined;
        return value;
    }


    EventBinding.defineType("document", "storage", (function () {
        var Binding = function (document, stateDomainName, storage) {
            var binding = this;
            binding.document = document;
            binding.stateDomainName = stateDomainName;
            binding.storage = storage;
            binding.registeredNodes = [];
            binding.clickListener = function (event) {
                binding.incrementalSync(event.target);
            };
            binding.hookup = function () {
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                        if (HexstreamSoft.dom.matches(node, "input[type=radio], input[type=checkbox]")
                            && node.dataset.stateValue
                            && nodeStateDomainName(node) === stateDomainName)
                        {
                            binding.registeredNodes.push(node);
                            binding.incrementalSync(node);
                            node.addEventListener("click", binding.clickListener);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true})
            };
            binding.initialSync = function () {
            };
            binding.incrementalSync = function (node) {
                var dataset = node.dataset;
                var key = dataset.stateKey;
                if (node.checked || dataset.stateAntivalue)
                    storage[key] = node.checked ? dataset.stateValue : dataset.stateAntivalue;
            };
        };
        return {
            bind: function (fromSpec, toSpec) {
                return [new Binding(fromSpec.document, fromSpec.stateDomainName, toSpec.storage)];
            },
        }
    })());


    EventBinding.defineType("storage", "classList", (function () {
        var Binding = function (storage, keys, document, nodeSelector) {
            var binding = this;
            binding.storage = storage;
            binding.keys = keys;
            binding.document = document;
            binding.nodeSelector = nodeSelector;
            binding.storageListener = function (event) {
                if (event.detail.storage === storage && window.document.body)
                    binding.incrementalSync(window.document.body);
            };
            binding.hookup = function () {
                window.addEventListener("HexstreamSoft.storage", binding.storageListener);
                binding.observer = new MutationObserver(function (records, observer) {
                    HexstreamSoft.dom.forEachAddedNode(records, function (node) {
                        if (node.tagName && node.tagName.toLowerCase() === binding.nodeSelector)
                        {
                            observer.disconnect();
                            binding.incrementalSync(node);
                        }
                    });
                });
                binding.observer.observe(document, {childList: true, subtree: true})
            };
            binding.initialSync = function () {
                if (window.document.body)
                    binding.incrementalSync(window.document.body);
            };
            binding.incrementalSync = function (node) {
                if (keys.length === 0)
                    return;
                node.className = "";
                var classes = node.classList;
                keys.forEach(function (key) {
                    if (storage.isRelevant(key))
                        classes.add(key + "=" + storage[key]);
                });
            };
        };
        return {
            bind: function (fromSpec, toSpec) {
                return [new Binding(fromSpec.storage, fromSpec.keys, toSpec.document, toSpec.nodeSelector)];
            },
        }
    })());

    function shallowCopy (object) {
        var copy = {};
        Object.keys(object).forEach(function (key) {
            copy[key] = object[key];
        });
        return copy;
    }

    function compose (main, bothSpec, endpointSpec) {
        var composed = shallowCopy(main);
        [bothSpec || {}, endpointSpec || {}].forEach(function (extra) {
            Object.keys(extra).forEach(function (key) {
                if (composed.hasOwnProperty(key))
                    throw Error("Clash for property \"" + key + "\".\n" + {main: main, bothSpec: bothSpec, endpointSpec: endpointSpec});
                else
                    composed[key] = extra[key];
            });
        });
        return composed;
    };

    function unibind (fromType, toType, fromSpec, toSpec, bothSpec, sourceSpec, destinationSpec) {
        var typeDefinition = EventBinding.types[fromType][toType];
        var bindings = typeDefinition.bindings;
        var combinedFromSpec = compose(fromSpec, bothSpec, sourceSpec);
        var combinedToSpec = compose(toSpec, bothSpec, destinationSpec);
        typeDefinition.bind(combinedFromSpec, combinedToSpec).forEach(function (newBinding) {
            bindings.push(newBinding);
            if (newBinding.hookup)
                newBinding.hookup();
            if (newBinding.initialSync)
                newBinding.initialSync();
        });
    }

    EventBinding.bind = function (endpoint1Type, direction, endpoint2Type, endpoint1Spec, sharedSpec, endpoint2Spec) {
        switch (direction)
        {
            case ">":
            var bothSpec = sharedSpec["both"];
            unibind(endpoint1Type, endpoint2Type,
                    endpoint1Spec, endpoint2Spec,
                    bothSpec, sharedSpec["source"], sharedSpec["destination"]);
            break;

            case "=":
            //TODO: Return one binding which has 2 child bindings instead.
            EventBinding.bind(endpoint1Type, ">", endpoint2Type, endpoint1Spec, sharedSpec, endpoint2Spec);
            EventBinding.bind(endpoint2Type, ">", endpoint1Type, endpoint2Spec, sharedSpec, endpoint1Spec);
            break;

            default:
            throw Error("Invalid direction \"" + direction + "\".");
        }
    };

    HexstreamSoft.EventBinding = EventBinding;

});



HexstreamSoft.modules.ensure("HexstreamSoft.misc", "HexstreamSoft.dom", "HexstreamSoft.ArrowsMadness");

if (document.location.protocol === "file:")
{
    HexstreamSoft.modules.ensure("HexstreamSoft.FixLinks");
}
