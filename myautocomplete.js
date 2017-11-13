(function ($) {




    // https://davidwalsh.name/javascript-debounce-function
    var debounce = function (func, wait, immediate) {
        var timeout;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };


    $.myAutoComplete = function (element, options) {


        var cache = {};

        var jInput = $(element);
        var o = $.extend({}, $.fn.myAutoComplete.defaults, options);
        var jPanel = o.panel;
        var serviceUri = o.uriService;
        var hasQuestionMark = (-1 !== serviceUri.indexOf('?'));
        var curItemClass = o.currentItemClass;


        //----------------------------------------
        // FETCH AND RENDER
        //----------------------------------------
        /**
         * Fetch the data (either from cache or from ajax service),
         * and call the onSuccess (or onError) callback in case of success (or error).
         *
         * @param query
         * @param onSuccess
         * @param onError
         */
        function fetchData(query, onSuccess, onError) {
            // use cache?
            if (true === o.useCache) {
                if (query in cache) {
                    return onSuccess(cache[query]);
                }
            }

            // default ajax fetching
            var uri = serviceUri;
            if (true === hasQuestionMark) {
                uri += '&';
            }
            else {
                uri += '?';
            }
            uri += 'query=' + query;

            var data = {};
            var jxqhr = $.post(uri, data, function (data) {
                if (true === o.useCache) { // put result in cache for later re-use
                    cache[query] = data;
                }
                onSuccess(data);
            }, "json").fail(function () {
                onError && onError(jxqhr);
            });

        }


        function getCurrentItemIndex() {
            var jCurrent = jPanel.find('.' + curItemClass);
            if (jCurrent.length) {
                var index = jCurrent.index("." + o.itemClass);
            }
            else {
                index = -1;
            }
            return index;
        }

        function adjustScroll(jItem) {
            var $container = jPanel;
            var $scrollTo = jItem;

            $container.animate({
                scrollTop: $scrollTo.offset().top - $container.offset().top + $container.scrollTop(),
                scrollLeft: 0
            }, 100);
        }

        function navigatePrevItem() {
            var index = getCurrentItemIndex();
            index--;
            jPanel.find("." + curItemClass).removeClass(curItemClass);
            jPanel.find("." + o.itemClass).eq(index).addClass(curItemClass);
            adjustScroll(jPanel.find("." + curItemClass));
        }

        function navigateNextItem() {
            var index = getCurrentItemIndex();
            index++;
            jPanel.find("." + curItemClass).removeClass(curItemClass);
            jPanel.find("." + o.itemClass).eq(index).addClass(curItemClass);
            adjustScroll(jPanel.find("." + curItemClass));
        }


        function showPanel(jPanel) {
            if (true === o.useKeyboardNav && null !== o.itemClass) {

                $(document).off("keyup.myautocomplete").on("keyup.myautocomplete", function (e) {
                    if (
                        38 === e.which || // up
                        40 === e.which  // down
                    ) {
                        if (40 === e.which) {
                            navigateNextItem();
                        }
                        else {
                            navigatePrevItem();
                        }
                    }

                    if (
                        13 === e.which &&
                        true === o.useEnterToClickCurrentItem
                    ) {
                        var jCur = jPanel.find("." + curItemClass);
                        if (jCur.length) {
                            o.onSelect(jCur);
                            return false;
                        }
                    }

                });
            }
            o.showPanel(jPanel);
        }

        function hidePanel(jPanel) {
            $(document).off("keyup.myautocomplete");
            o.hidePanel(jPanel);
        }


        jInput.on("keyup.myautocomplete", debounce(function (e) {
            /**
             * We only trigger fetch data on  alpha num punct chars,
             * plus the following chars, which should update the query also:
             *
             * - backspace
             * - delete
             *
             * https://css-tricks.com/snippets/javascript/javascript-keycodes/
             */
            if (
                8 === e.which || // backspace
                46 === e.which || // delete
                (e.which >= 48 && e.which <= 90) || // 0-9 and a-z
                (e.which >= 96 && e.which <= 105) || // numpad 0-9
                (e.which >= 186 && e.which <= 192) || // various punctuations
                (e.which >= 219 && e.which <= 222) // various punctuations
            ) {
                var query = $(this).val();
                var strlen = query.length;
                if (strlen >= o.minChars) {


                    o.onLoaderStart();


                    fetchData(query, function (data) {

                        o.onLoaderEnd();

                        if (jPanel) { // use panel goodies?
                            if (o.isEmptyResults(data)) {
                                hidePanel(jPanel);
                            }
                            else {
                                showPanel(jPanel);
                            }
                        }


                        o.renderData(data, query);
                    }, o.onAjaxFail);
                }
                else {
                    if (jPanel) { // use panel goodies?
                        hidePanel(jPanel);
                    }
                    o.renderData(null, query);
                }
            }

        }, o.delay));


        jInput.on("blur.myautocomplete", function (e) {
            if (jPanel) { // use panel goodies?
                setTimeout(function () {
                    hidePanel(jPanel);
                }, 200);
            }
        });


        //----------------------------------------
        // GUI INTERACTION WITH RESULTS
        //----------------------------------------
        if (jPanel) {
            if (null !== o.itemClass) {
                jPanel.on('click', function (e) {
                    var jTarget = $(e.target);
                    var jItem = jTarget.closest("." + o.itemClass);
                    if (jItem.length) {
                        o.onSelect(jItem);
                        return false;
                    }
                });
            }
        }


    };

    $.fn.myAutoComplete = function (options) {
        return this.each(function () {
            if (undefined == $(this).data('myAutoComplete')) {
                var plugin = new $.myAutoComplete(this, options);
                $(this).data('myAutoComplete', plugin);
            }
        });
    };


    //----------------------------------------
    // UTILS
    //----------------------------------------
    /**
     * Create space separated components from query.
     * For each component, search/replace by bold version in resultLabel.
     */
    $.fn.myAutoComplete.decorateLabel = function (query, resultLabel) {
        query = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        var re = new RegExp("(" + query.split(' ').join('|') + ")", "gi");
        return resultLabel.replace(re, "<b>$1</b>");
    };

    /**
     * If $something is an array or an object:
     *      return true if empty, false otherwise
     * If $something is not an array nor an object:
     *      returns $theDefault=true
     */
    $.fn.myAutoComplete.isEmpty = function (something, theDefault) {
        if (jQuery.isArray(something) || jQuery.isPlainObject(something)) {
            if (
                (jQuery.isArray(something) && 0 === something.length) ||
                jQuery.isEmptyObject(something)
            ) {
                return true;
            }
            return false;
        }
        if ('undefined' === typeof theDefault) {
            theDefault = true;
        }
        return theDefault;
    };


    //----------------------------------------
    // DEFAULTS
    //----------------------------------------
    $.fn.myAutoComplete.defaults = {
        //----------------------------------------
        // AJAX COMMUNICATION - FETCHING AND RENDERING
        //----------------------------------------
        useCache: true,
        delay: 150,
        minChars: 1,
        uriService: "/service/Ekom/json/api?action=product-search",
        onAjaxFail: function (jxqhr) {
            console.log("myautocomplete: onAjaxFail with error: " + jxqhr.responseText);
        },
        /**
         * If data is null, it's the signal that the panel should
         * be empty.
         */
        renderData: function (data, query) {
            console.log("render data");
            console.log(data, query);
        },
        //----------------------------------------
        // PANEL GUI INTERACTION
        //----------------------------------------
        /**
         * The rendering panel: a jquery element like $("#panel").
         * If null (default), you are on your own.
         * If not null, the myAutoComplete plugin tries to
         * help you with various methods.
         *
         */
        panel: null,
        /**
         * only if panel is not null.
         *
         * After a stroke in the search input, examine the length
         * of the query string. If greater than minChars, show
         * the panel, otherwise hide the panel.
         *
         * Also, if the results data is empty the panel will hide (and show if not empty).
         * Whether or not the results data is empty is defined by the isEmptyResults option.
         *
         * Also, when the user focus out of the search input, the panel will hide.
         *
         */
        usePanelShowHide: true,
        /**
         * The method used to show the panel
         */
        showPanel: function (jPanel) {
            jPanel.addClass("visible");
        },
        /**
         * The method used to hide the panel
         */
        hidePanel: function (jPanel) {
            jPanel.removeClass("visible");
        },
        /**
         * Function to evaluate whether or not the returned data
         * is empty.
         *
         * By default, if the data is an non empty array or non empty object
         * returns true. In all other case return false.
         */
        isEmptyResults: function (data) {
            if (jQuery.isArray(data) || jQuery.isPlainObject(data)) {
                if (
                    (jQuery.isArray(data) && 0 === data.length) ||
                    jQuery.isEmptyObject(data)
                ) {
                    return true;
                }
                return false;
            }
            return true;
        },
        /**
         * The panel appears, but then what happens if the user clicks
         * on an item?
         * This plugin can help you with this by providing a click handler
         * on items.
         *
         * Each query yields a number of items that you display in the panel.
         *
         * If your query has the class defined by this option (itemClass), then a click on
         * it will trigger the onSelect action.
         *
         * If itemClass is null, this behavior is not used, and you handle the click
         * behaviour for yourself.
         *
         * The $itemClass is searched in the context of the panel,
         * and therefore the panel must be defined too.
         *
         */
        itemClass: 'item',
        /**
         * if you use the "itemClass" behaviour,
         * then what happens when the user clicks an item?
         *
         * By default, it redirects to the uri defined on the
         * item's data-uri attribute
         */
        onSelect: function (jItem) {
            var href = jItem.attr('data-uri');
            location.href = href;
        },
        /**
         * If panel is defined AND itemClass is defined only
         * Will allow the user to navigate through items (with class $itemClass)
         * using up/down arrows
         */
        useKeyboardNav: true,
        /**
         * When keyboard navigation is on,
         * the item with focus gets the $currentItemClass class.
         */
        currentItemClass: "active",
        /**
         * Only if the following options are set:
         *      - panel
         *      - useKeyboardNav
         *      - itemClass
         *      - currentItemClass
         *
         * If true,
         *      if enter is pressed AND an active item is found,
         *      then the onSelect method (option) is called on the item.
         */
        useEnterToClickCurrentItem: true,
        onLoaderStart: function () {

        },
        onLoaderEnd: function () {

        }

    };


})(jQuery);

