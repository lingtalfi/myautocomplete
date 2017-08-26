MyAutoComplete
===================
2017-08-25



A jquery autocomplete plugin.




Features
=============
- lightweight (the commented version is about 400 lines)
- code easy to understand
- is rendering agnostic 




How does it work?
===================

The auto-complete session starts when the user types something into an input.
Then data is fetched from somewhere.
Then the fetched data is rendered.

The code is organized in two parts:

- fetching and rendering the data  
- interacting with the rendered data



Fetching and rendering the data
==============================

The fetching starts when an alpha-numeric-punct char is typed on
the target input.
In the current implementation, the fetching part uses an ajax service and/or a cache.

In future implementation, other ways of fetching data can be added.

The ajax service can return anything, which is called data.

The data is then passed to the render functions which display the data how you want it. 

So, you could display a simple list of text items, or a more complex multiple search system
with different sections and images, it's up to you.


Nomenclature
------------

Nomenclature is important:

- query: is the string typed by the user: the value of the target input at any given time
- data: this is the result of the ajax service 




Interacting with the rendered data
==================================

This phase is about handling the following problems:

- what happens if the user selects an item
- what happens if the user blurs out of the target input


The myAutoComplete plugin is agnostic, but provides some tools to help you implement
common gui logic (like for instance an up/down arrow navigation system).


All this is explained in the source's comments.


  
Example
============

I have no time for a simple example, but here is the example I've just finished today.

This is a complex example because the search engine yields two types of results at the same time:

- products
- categories

(this is a search engine for e-commerce)

A list of images appear for products, while the category list contains only simple text items.
The result on the development website looks like this:


[![myautocomplete.png](https://s19.postimg.org/83xaog9cz/myautocomplete.png)](https://postimg.org/image/qjhrlunhb/)

So here is the html code:

```html
           <div class="searchbar-container">
                <div class="searchbar">
                    <div class="search-icon lee-icon" id="topmenu-searchtrigger-small"></div>
                    <form method="post"
                          action="">
                        <input type="text" placeholder="Chercher" id="searchbar-input">
                    </form>
                    <button class="cancel-search lee-icon" id="searchbar-cancel">Cancel</button>
                    <ul>
                        <li class="topmenu-action-search"><span class="lee-icon action action-search">Recherche</span>
                        </li>
                    </ul>
                </div>
                <div class="search-results-panel">
                    <div class="section section-categories">
                        <div class="title">SUGGESTION DE CATÉGORIES</div>
                        <ul class="items-list-categories"></ul>
                    </div>
                    <div class="section section-products">
                        <div class="title">SUGGESTION DE PRODUITS</div>
                        <ul class="items-list"></ul>
                    </div>
                    <div class="templates" style="display: none">
                        <ul class="items-list">
                            <li class="item" data-uri="{-uri_card-}">
                                <div class="image">
                                    <img data-src="{-uri_thumb-}"
                                         alt="{-%label-}">
                                </div>
                                <span class="label">{-label-}</span>
                                <span class="attributes">{-attr_string-}</span>
                                <span class="ref">ref. {-ref-}</span>
                                <span class="price">
                                        <span class="price-text">{-sale_price-}</span>
                                        <abbr class="price-type">{-price_type-}</abbr></span>
                            </li>
                        </ul>
                        <ul class="items-list-categories">
                            <li class="item" data-uri="{-uriCategory-}"><a href="{-uriCategory-}">{-label-}</a></li>
                        </ul>
                    </div>
                </div>
            </div>


```


Note: you may have noticed the ".templates" div, in which I put the templates used 
to feed the results panel. 
By the way, in this code I'm using the [cloneTemplate](https://github.com/lingtalfi/cloneTemplate) technique to
inject items into the search results panel.


And here is the jquery code:

```js
    var jTopBar = $('#site-topbar');
    var jSearchContainer = $('.searchbar-container', jTopBar);
    var jSearchResultsPanel = $('.search-results-panel', jSearchContainer);
    var jSearchInput = $('#searchbar-input');
    var jSearchCategorySection = jSearchContainer.find('.section-categories');
    var jSearchProductsSection = jSearchContainer.find('.section-products');
    var jSearchTemplates = jSearchContainer.find('.templates');
    var jSearchProductTpl = jSearchTemplates.find('.items-list .item');
    var jSearchCategoryTpl = jSearchTemplates.find('.items-list-categories .item');


    function refreshSearchPanel(data, query) {
        //----------------------------------------
        // PRODUCTS
        //----------------------------------------
        var jUl = jSearchProductsSection.find('.items-list');
        jUl.empty();
        var jClone = null;
        var products = data.products;
        if ($.isEmptyObject(products)) {
            jSearchProductsSection.hide();
        }
        else {
            jSearchProductsSection.show();
        }
        for (var i in products) {
            var product = products[i];
            jClone = $.fn.cloneTemplate(jSearchProductTpl, product);
            jUl.append(jClone);
        }


        //----------------------------------------
        // CATS
        //----------------------------------------
        var jUl2 = jSearchCategorySection.find('.items-list-categories');
        jUl2.empty();
        var cats = data.categories;
        if ($.isEmptyObject(cats)) {
            jSearchCategorySection.hide();
        }
        else {
            jSearchCategorySection.show();
        }
        for (var i in cats) {
            var cat = cats[i];
            jClone = $.fn.cloneTemplate(jSearchCategoryTpl, cat);
            jUl2.append(jClone);
        }
    }


    jSearchInput.myAutoComplete({
        uriService: "/service/Ekom/json/api?action=product-search",
        renderData: function (data, query) {
            if (null !== data) {
                refreshSearchPanel(data, query);
            }
            else {
                var jUl = jSearchProductsSection.find('.items-list');
                jUl.empty();
                var jUl2 = jSearchCategorySection.find('.items-list-categories');
                jUl2.empty();
            }
        },
        minChars: 3,
        panel: jSearchResultsPanel,
        isEmptyResults: function (data) {
            return (
                true === $.fn.myAutoComplete.isEmpty(data.products) &&
                true === $.fn.myAutoComplete.isEmpty(data.categories)
            );
        }
    });

``` 

 
Hopefully this example helps you understand how the plugin works.
 
 
Oh yeah and I forgot: my ajax service returns a php array containing the following:

```php
- products:
----- (row)
--------- label 
--------- ref 
--------- sale_price 
--------- attr_string 
--------- uri_card
--------- uri_thumb 
--------- price_type 
- categories:
----- (row)
--------- label 
--------- slug
--------- uriCategory
 
         
``` 





History Log
------------------    
    
- 1.0.0 -- 2017-08-26

    - initial commit



 
 