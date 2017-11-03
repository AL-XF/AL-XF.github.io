var Chart = (function(window,d3) {
    
    var svg, rawData, dataFixed, keyData, chemicalSelection, ySelection, x, y, xAxis, yAxis, 
        dim, xMap, yMap, chartWrapper, margin = {}, width, height, foundBio, notFound;
    var bioList = ['ALB', 'ALP', 'ALT', 'BUN', 'CK', 'CREAT', 'PROTEIN', 'SDH'];
    var bioUnit = {
                    ALB     : 'g/dL',
                    ALP     : 'U/L',  
                    ALT     : 'U/L',
                    BUN     : 'mg/dL',
                    CK      : 'U/L',
                    CREAT   : 'mg/dL',
                    PROTEIN : 'g/dL',
                    SDH     : 'U/L'
                    };
    var excludeChemical = ['No stressor', 'no stressor', 'No Stressor'];

    queue()
    .defer(d3.tsv, '/data/data.tsv')
    .defer(d3.tsv, '/data/keys.txt')
    .await(init); 

    function init(error, data, keys){
        /*
        data:   research dataset.
        keys:   full names for tests
        */
        "use strict";
        rawData = data;
        keyData = keys;
        notFound = 0;
        //select Chemical
        
        chemicalSelection = getUrlVariable('chemical_name', 'Acetaminophen');
        console.log(chemicalSelection);

        //Biological Selection
        ySelection = 'ALB';
        foundBio = keyData.filter(function (d){ return d.ASSAY_ABBR === ySelection; });

        //data filter
        dataFixed = rawData.filter(function (d) { 
            if( d.CHEMICAL_NAME === chemicalSelection )
            {
                return d;
            }
        });
        if ((typeof dataFixed === 'undefined' || dataFixed.length === 0)) {
            notFound = 1;
        }
        if (excludeChemical.includes(chemicalSelection)){
            notFound = 1;
        }
        

        //initialize axis
        xAxis = d3.svg.axis().orient('bottom').ticks(10);;
        yAxis = d3.svg.axis().orient('left');

        //initialize scales
        var xExtent = d3.extent(dataFixed, function(d,i) { return +d.DOSE; });
        var yExtent = d3.extent(dataFixed, function(d,i) { return +d[ySelection]; });
        x = d3.scale.linear().domain(extentExtent(xExtent));        
        y = d3.scale.linear().domain(extentExtent(yExtent));

        //initialize dots map
        var xValue = function(d) { return +d.DOSE; };
        var yValue = function(d) { return +d[ySelection]; };
        xMap = function(d) { return x(xValue(d)); };
        yMap = function(d) { return y(yValue(d)); };

        //initialize svg
        svg = d3.select('#chemical_chart')
            .append('svg');
        chartWrapper = svg.append('g');

        chartWrapper.append('g')
            .classed('x axis', true);
        chartWrapper.append('g')
            .classed('y axis', true);


        //initialize select bio buttons    
        var bioButtons = d3.select('#chemical_chart')
        .append('div')
        .attr('class', 'bio_buttons')
        .selectAll('div')
        .data(bioList)
        .enter()
        .append('div')
        .attr('class', function(d) {return d;})
        .text(function(d) {return d;});

        bioButtons.on('click', function(d) {            
            d3.select('.bio_buttons')
                .selectAll('div')
                .transition()
                .duration(500)
                .style('background', '#A5D6A7')
                .style('color', 'black');

            d3.select(this)
                .transition()
                .duration(500)
                .style('background', '#2E7D32')
                .style('color', 'white');
            
            ySelection = d;
            dataUpdate();
            render();
        });

        //render the chart
        render();

    }

    function dataUpdate() {
        //update dataset
        dataFixed = rawData.filter(function (d) { 
            if( d.CHEMICAL_NAME === chemicalSelection )
            {
                return d;
            }
        });
        foundBio = keyData.filter(function (d){ return d.ASSAY_ABBR === ySelection });

        //re-range y-axis
        var yExtent = d3.extent(dataFixed, function(d,i) { return +d[ySelection]; });     
        y = d3.scale.linear().domain(extentExtent(yExtent));

        //reset dot with new scale
        var yValue = function(d) { return +d[ySelection]; };
        yMap = function(d) { return y(yValue(d)); };

    }

    function render() {
        
            //get dimensions based on window size
            updateDimensions(window.innerWidth);

            //update x and y scales to new dimensions
            x.range([0, width]);
            y.range([height, 0]);

            //update svg elements to new dimensions
            svg
                .attr('width', width + margin.right + margin.left)
                .attr('height', height + margin.top + margin.bottom);
            chartWrapper.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

            //update the axis and line
            xAxis.scale(x);
            yAxis.scale(y);

            svg.select('.x.axis')
                .attr('transform', 'translate(0,' + height + ')')
                .call(xAxis);
      
            svg.select('.y.axis')
                .call(yAxis);
            
            //titles
            svg.selectAll('.titles').remove();
            svg.append('text')
                .attr('class', 'titles')
                .attr('x', width / 2 )
                .attr('y', 30)
                .style("text-anchor", "middle")
                .text(chemicalSelection + ' Effects in Biological System');
            svg.append('text')
                .attr('class', 'titles')
                .attr('x', (width / 2) + 5 )
                .attr('y', 50)
                .style("text-anchor", "middle")
                .text( ySelection + ' (' + foundBio[0].ASSAY_NAME + ')');

            //chemical not found warning
            svg.selectAll('.warningLabel').remove();
            if (notFound === 1) {
                svg.append('text')
                    .attr('class', 'warningLabel')
                    .attr('x', width / 2 )
                    .attr('y', 150)
                    .style("text-anchor", "middle")
                    .text(chemicalSelection + ' is unable to find in the database. Please try another one');

                notFound = 0;
            }
            
            //axis labels
            svg.selectAll('.axisLabel').remove();
            svg.append('text')
                .attr('class', 'axisLabel')
                .attr('x', width / 2 )
                .attr('y', height + margin.top + margin.bottom - 16)
                .style("text-anchor", "middle")
                .text('Dose (' + getDoseUnit(dataFixed) + ')');
            svg.append('text')
                .attr('class', 'axisLabel')
                .attr("transform", "translate("+ (margin.left/3) +","+ ((margin.top + height)/2) + ")rotate(-90)")
                .attr("dy", "0.8em")
                .style("text-anchor", "middle")
                .text( ySelection + ' (' + bioUnit[ySelection] +')' );
            
            //remove all lines and re-draw
            chartWrapper.selectAll('.dot').remove();
            chartWrapper.selectAll('.dot')
                .data(dataFixed)
                .enter()
                .append('circle')
                .classed('dot', true)
                .attr('cx', xMap)
                .attr('cy', yMap)
                .attr('r', '0.2em')
                .style('fill', 'steelblue');
    }

    function getDoseUnit(d) {
        return d[0].DOSE_UNIT;
    }

    function extentExtent(extentArray) {
        var newExtent = [+extentArray[0] - 1, +extentArray[1] + 1 ];
        return newExtent;
    }
    
    function updateDimensions(winWidth) {
        margin.top = 70;
        margin.right = 150;
        margin.left = 70;
        margin.bottom = 50;
    
        width = winWidth - margin.left - margin.right;
        height = 550 - margin.top - margin.bottom;
    }

    function getUrlVariable(variable, defaultValue)
    {
           var query = window.location.search.substring(1);
           var vars = query.split('&');
           for (var i=0; i<vars.length; i++) {
                   var pair = decodeURI(vars[i]).split('=');
                   if(pair[0] == variable){
                       return pair[1];
                    }
           }
           return defaultValue;
    }

    return {
        render : render,
    }

})(window,d3);