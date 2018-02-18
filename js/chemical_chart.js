var Chart = (function(window,d3) {
    
    var svg, rawData, dataFixed, keyData, chemicalSelection, ySelection, x, y, xAxis, yAxis, xTickFix, 
        dim, xMap, yMap, chartWrapper, margin = {}, width, height, foundBio, notFound,
        chemicalReport, reportTable, reportConclusion;
    var bioList = ['ALB', 'ALP', 'ALT', 'BUN', 'CK', 'CREAT', 'PROTEIN', 'SDH'];
    var reportList = ['DOSE','ALB', 'ALP', 'ALT', 'BUN', 'CK', 'CREAT', 'PROTEIN', 'SDH'];
    var standardValue = {};
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
        
        //initialize Standard
        standardValue = getStandardValue(dataFixed);

        //initialize axis
        xAxis = d3.svg.axis().orient('bottom');
        yAxis = d3.svg.axis().orient('left');

        //initialize scales
        var xExtent = d3.extent(dataFixed, function(d,i) { return +d.DOSE; });
        var yExtent = d3.extent(dataFixed, function(d,i) { return +d[ySelection]; });
        x = d3.scale.linear().domain(extentExtent(xExtent));        
        y = d3.scale.linear().domain(extentExtent(yExtent));

        var minX = xExtent[0];
        xTickFix = x.ticks();
        xTickFix.push(minX);

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

        //initialize detailed report
        chemicalReport = d3.select('#chemical_report')
                            .append('div')
                            .attr('class','report');
        reportTable = chemicalReport.append('table');

        reportConclusion = d3.select('#conclusion')
                            .append('div')
                            .attr('class','report_conclu');
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

    function generateReport() {
        /*
        Generate the report table
        Use the madian of lowest DOSE data as standard value.
        Normal range is between standard value X 75% and standard value X 125%
        Count abnormal results to measure whether the test object effect bio system.
        */
        //nest combined data
        var reportData = d3.nest()
                            .key(function(d){
                                if(isNaN(d.DOSE))
                                    d.DOSE = 0;
                                return +d.DOSE;
                            }).sortKeys((a, b) => a - b)
                            .rollup(function(leaves){
                                var bioResult = {};
                                for (i = 0; i < bioList.length; i++){
                                    
                                    var mean_value = d3.mean(leaves, function(d) {
                                        return +d[bioList[i]];
                                    });
                                    var abnormalCount = 0;
                                    for (var index =0; index<leaves.length; index++){
                                        if(leaves[index][bioList[i]] < standardValue[bioList[i]]*0.75 ||
                                            leaves[index][bioList[i]] > standardValue[bioList[i]]*1.25)
                                            abnormalCount++;
                                    }
                                    bioResult[bioList[i]] = {'mean' : mean_value, 'abnormal' : abnormalCount};    
                                }
                                bioResult['count'] = leaves.length;
                                return bioResult;
                            })
                            .entries(dataFixed);
                            
        reportTable.selectAll('thead').remove();
        reportTable.selectAll('tbody').remove();
        var thead = reportTable.append('thead');
        var tbody = reportTable.append('tbody');
        
        //append table header
        //mean, abnormal count, abnormal rate
        thead.append('tr')
            .selectAll('th')
            .data(reportList)
            .enter()
            .append('th')
            .attr('colspan',function (d) { if(d=='DOSE')return 1;else return 3; })
            .text(function (d) { return d; });
        
        thead.append('tr')
            .html(function (d) {
                var htmlOutput = '<td> </td>';
                for (i = 0; i < bioList.length; i++){
                    var tempOutput = '<td> Mean </td>' +
                                    '<td>Ab Count</td>' +
                                    '<td>Ab Rate</td>';
                    htmlOutput += tempOutput;
                }
                return htmlOutput; 
            });
    
        //create a empty total for farther use    
        var totalVar = {};
        for (i = 0; i < bioList.length; i++){
            totalVar[bioList[i]] = {'abnormal': 0, 'total': 0};
        }

        //append table contain
        tbody.selectAll('tr')
            .data(reportData)
            .enter()
            .append('tr')
            .html(function(d){
                var htmlOutput = '<td> '+ d.key + '</td>';
                for (i = 0; i < bioList.length; i++){
                    var mean = +d.values[bioList[i]]['mean'].toFixed(2);
                    var rate = d.values[bioList[i]]['abnormal'] * 100/d.values['count'];
                    var tempOutput = '<td>' + mean + '</td>' +
                                    '<td>' + d.values[bioList[i]]['abnormal'] + '</td>' +
                                    '<td>' + rate.toFixed(2) + '%</td>';
                    htmlOutput += tempOutput;
                    totalVar[bioList[i]]['abnormal'] += d.values[bioList[i]]['abnormal'];
                    totalVar[bioList[i]]['total'] += d.values['count'];
                }
                return htmlOutput;
            });

        tbody.append('tr')
            .html(function(d){
                    var htmlOutput = '<td> Total </td>';
                    for (i = 0; i < bioList.length; i++){
                        var rate = totalVar[bioList[i]]['abnormal'] * 100 / totalVar[bioList[i]]['total'];
                        var tempOutput = '<td> - </td>' +
                                        '<td>' + totalVar[bioList[i]]['abnormal'] + '</td>' +
                                        '<td>' + rate.toFixed(2) + '%</td>';
                        htmlOutput += tempOutput;
                    }
                    return htmlOutput;
                });

        //Generate conclusion
        var warningError = '', bigEffect = [], smallEffect = [], noEffect = [];

        for (i = 0; i < bioList.length; i++){

            var abRate = totalVar[bioList[i]]['abnormal'] / totalVar[bioList[i]]['total'];
            var preRate = reportData[0].values[bioList[i]]['abnormal'] / reportData[0].values['count'];

            if(preRate > 0.4){
                //warning ERROR
                warningError += bioList[i] + 
                ' may be not a valid analysis, because the abnormal rate of the lowest DOSE is very high, the normal range for this case seems incorrected. <br />';
            }
            if(abRate >= 0.5){
                //big effect
                bigEffect.push(bioList[i]);
            }else if(abRate >= 0.2){
                //small effect
                smallEffect.push(bioList[i]);
            }else{
                //no effect
                noEffect.push(bioList[i]);
            }          
        }
        
        var outputBig = generateConclu(bigEffect, totalVar);
        var outputSmall = generateConclu(smallEffect, totalVar);
        var outputNo = generateConclu(noEffect, totalVar);

        var printHtml = '';
        if(outputBig){
            printHtml += outputBig[0];
            if(outputSmall){
                printHtml += outputSmall[0];
                printHtml +='<h5>' + chemicalSelection + ' effects ' + outputBig[1] + ' significantly, effects ' +
                            outputSmall[1] + ' not significantly. </h5>';
            }else{
                printHtml +='<h5>' +  chemicalSelection + ' effects ' + outputBig[1] + ' significantly. </h5>';
            }
        }else if(outputSmall){
            printHtml += outputSmall[0];
            printHtml += '<h5>' + chemicalSelection + ' effects ' + outputSmall[1] + ' not significantly.  </h5>';
        }

        if(outputNo){
            printHtml += outputNo[0];
            printHtml += '<h5>Either ' + chemicalSelection + ' effects ' + outputNo[1] + 
                        ' insignificantly or measurement records of ' + outputNo[1] + ' are missing.</h5>';
        }

        //print out report
        reportConclusion.selectAll('div').remove();
        reportConclusion.append('div')
                        .attr('class','warningE')
                        .html(warningError);
        reportConclusion.append('div')
                        .attr('class','conReport')
                        .html(printHtml);
        
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
            xAxis.scale(x).tickValues(xTickFix);;
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

            //display report
            generateReport();
    }

    function getDoseUnit(d) {
        return d[0].DOSE_UNIT;
    }

    function getStandardValue(d) {
        var nested = d3.nest()
                        .key(function(d){
                            if(isNaN(d.DOSE))
                                d.DOSE = 0;
                            return +d.DOSE;
                        }).sortKeys((a, b) => a - b)
                        .rollup(function(leaves){
                            var bioResult = {};
                            for (i = 0; i < bioList.length; i++){
                                var median_value = d3.median(leaves, function(d) {
                                    return +d[bioList[i]];
                                });
                                bioResult[bioList[i]] = median_value;    
                            }
                            return bioResult;
                        })
                        .entries(d);
        return nested[0].values;
    }

    function generateConclu(list, totalList){
        var output = '', items = '';
        if(list.length > 0){
            for (i = 0; i < list.length; i++){
                var pRate = totalList[list[i]]['abnormal']*100 / totalList[list[i]]['total'];
                output += 'Abnormal rate of ' + list[i] + ' is ' + pRate.toFixed(2) + '%. <br /> ';

                if(list.length > 1){
                    if(i == list.length - 1){
                        items += 'and ' + list[i];
                    }else{
                        items += list[i] + ', ';
                    }
                }else{
                    items = list[i];
                }
            }
            return [output, items];
        }else
            return false;    
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