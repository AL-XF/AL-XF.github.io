var piechart = (function(window,d3) {
    var oData, rawData, dataNested, margin = {}, width, height, smallestSegment = 2;
    var subChartMargin = {top: 120, right: 20, bottom: 30, left: 50};
    var subChartData, subChartTitle, inputLabel;
    var causeText = {
        '1':'Tuberculosis',
        '2':'Syphilis',
        '3':'HIV',
        '4':'Malignant neoplasms',
        '5':'Malignant neoplasm of stomach',
        '6':'Malignant neoplasms of colon, rectum and anus ',
        '7':'Malignant neoplasm of pancreas',
        '8':'Malignant neoplasms of trachea, bronchus and lung',
        '9':'Malignant neoplasm of breast',
        '10':'Malignant neoplasms of cervix uteri, corpus uteri and ovary',
        '11':'Malignant neoplasm of prostate',
        '12':'Malignant neoplasms of urinary tract',
        '13':'Non-Hodgkin\'s lymphoma',
        '14':'Leukemia',
        '15':'Other malignant neoplasms',
        '16':'Diabetes mellitus',
        '17':'Alzheimer\'s disease',
        '18':'Major cardiovascular diseases',
        '19':'Diseases of heart',
        '20':'Hypertensive heart disease with or without renal disease',
        '21':'Ischemic heart diseases',
        '22':'Other diseases of heart',
        '23':'Essential (primary) hypertension and hypertensive renal disease',
        '24':'Cerebrovascular diseases',
        '25':'Atherosclerosis',
        '26':'Other diseases of circulatory system',
        '27':'Influenza and pneumonia',
        '28':'Chronic lower respiratory diseases',
        '29':'Peptic ulcer',
        '30':'Chronic liver disease and cirrhosis',
        '31':'Nephritis, nephrotic syndrome, and nephrosis',
        '32':'Pregnancy, childbirth and the puerperium',
        '33':'Certain conditions originating in the perinatal period',
        '34':'Congenital malformations, deformations and chromosomal abnormalities',
        '35':'Sudden infant death syndrome',
        '36':'Symptoms, signs and abnormal clinical and laboratory findings',
        '37':'All other diseases (Residual)',
        '38':'Motor vehicle accidents',
        '39':'unspecified accidents and adverse effects',
        '40':'Intentional self-harm (suicide)',
        '41':'Assault (homicide)',
        '42':'All other external causes'
    };
    function getcauseKey(value){
        for (i = 0; i < 43; i++){
            if(causeText[i] === value){
                return i.toString();
            }
        }
    }
    var subKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    var yearText = {
        '1':'Under 1 year',
        '2':'1 - 4 years',
        '3':'5 - 14 years',
        '4':'15 - 24 years',
        '5':'25 - 34 years',
        '6':'35 - 44 years',
        '7':'45 - 54 years',
        '8':'55 - 64 years',
        '9':'65 - 74 years',
        '10':'75 - 84 years',
        '11':'85 years and over',
        '12':'Age not stated',
    };
    var chartFilter = {
        'year'  : 'all',
        'sex'   : 'all'    
    }
    var lineColor = colorbrewer.Blues[12];

    d3.queue()
      .defer(d3.csv, '/data/deathdata.csv')
      .await(init); 

    function init(error, data){        
        "use strict";               
        oData = data;
        //remove cause #37
        rawData = oData.filter(function(d){ return d.ucr39 != '37'; });
        dataNested = nestData(rawData, chartFilter);

        d3.selectAll('input')
            .on('change',updateSelection);

        $(render());
    }

    function render() {
        //get dimensions based on window size
        updateDimensions(window.innerWidth);
        if($('div[d3pie]').length == 0) {
            makePie(dataNested);
            //update pie text
            pieLabelFix();
        }else{
            d3.select('#pieChart').select('svg').remove();
            makePie(dataNested);
        }
        
        if($('svg#subSvg').length != 0){
            updateSubchart(subChartData,subChartTitle);
        }
    }

    function pieLabelFix(){
        d3.select('.p0_labels-outer')
                .selectAll('g text')
                .text(function(d){
                    if (d.label != 'other'){
                        return causeText[d];
                    }              
                });
    }

    function nestData(data, chartFilter){
        var dataFixed = data.filter(function (d) { 
                            if(chartFilter.year != 'all' && chartFilter.sex != 'all'){
                                if(d.year === chartFilter.year && d.sex === chartFilter.sex){
                                    return d;
                                }
                            } else {
                                if(chartFilter.year != 'all' || chartFilter.sex != 'all'){
                                    if(chartFilter.year != 'all'){
                                        if(d.year === chartFilter.year){
                                            return d;
                                        }
                                    }
                                    if(chartFilter.sex != 'all'){
                                        if(d.sex === chartFilter.sex){
                                            return d;
                                        }
                                    }
                                } else {
                                    return d;
                                }
                            }                
                        });
        
        var returnData = d3.nest()
                        .key(function(d){
                            return d.ucr39;
                        })
                        .rollup(function(leaves){
                            return d3.sum(leaves, function(d){
                                return d.count;
                            });
                        })
                        .entries(dataFixed)
                        .map(function(d){
                            return { label: causeText[d.key.toString()], value: d.value};
                        });;
        return returnData;        

    }

    function nestDataByAge(data, deathrecode){
        if(Array.isArray(deathrecode)){
            var dataFixed = data.filter(function (d) { 
                if(deathrecode.includes(d.ucr39)){
                    return d;
                }});
        }else{
            var dataFixed = data.filter(function (d) { 
                if(d.ucr39 === deathrecode){
                    return d;
                }});
        }
        
        var returnData = d3.nest()
                            .key(function(d){
                                return d.year;
                            })
                            .key(function(d){
                                return d.ager12;
                            })
                            .rollup(function(leaves){
                                return d3.sum(leaves, function(d){
                                    return d.count;
                                });
                            })
                            .entries(dataFixed)
                            .map(function(d){
                                var total = 0;
                                for (i = 0; i < d.values.length; i++){
                                    total += d.values[i].value;
                                }
                                var reform =  {year: +d.key};
                                for (i = 0; i < d.values.length; i++){
                                    var rate =  d.values[i].value / total
                                    reform[d.values[i].key] = rate.toFixed(4);
                                }
                                return reform;
                            });      
        for (i = 0; i < returnData.length; i++){
            for(j = 0; j < 12; j++){
                if(typeof returnData[i][j+1] === 'undefined'){
                    returnData[i][j+1] = '0.0000';
                }
            }
        }
        return returnData;
    }

    function updateSelection(){
        var selection = this.value;
        if(selection != 'all'){
            rawData = oData.filter(function(d){ return d.ucr39 != '37' && d.sex == selection; });
        }else{
            rawData = oData.filter(function(d){ return d.ucr39 != '37'; });
        }
        dataNested = nestData(rawData, chartFilter);
        subChartData =  nestDataByAge(rawData, inputLabel);
        $(render());
    }

    function makePie(data){
        var pie = new d3pie('pieChart', {
            header: {
                title: {
                    text: '2006 ~ 2016 Mortality Data Statistics',
                    fontSize: 24,
                    font: 'open sans'
                },
                subtitle: {
                    text: '39 Cause Recode.',
                    color: '#999999',
                    fontSize: 12,
                    font: 'open sans'
                },
                titleSubtitlePadding: 9
            },
            size: {
                canvasHeight: 550,
                canvasWidth: 750,
                pieOuterRadius: '75%'
            },
            data: {
                sortOrder: 'value-desc',
                smallSegmentGrouping: {
                    enabled: true,
                    value: smallestSegment
                },
                content: data
            },
            labels: {
                outer: {
                    pieDistance: 32
                },
                inner: {
                    hideWhenLessThanPercentage: smallestSegment
                },
                mainLabel: {
                    fontSize: 11
                },
                percentage: {
                    color: '#ffffff',
                    decimalPlaces: 1
                },
                value: {
                    color: '#adadad',
                    fontSize: 11
                },
                lines: {
                    enabled: true
                },
                truncation: {
                    enabled: true
                }
            },
            misc: {
                gradient: {
                    enabled: true,
                    percentage: 100
                }
            },
            tooltips: {
                enabled: true,
                type: 'placeholder',
                string: 'Cause: {label} | Count: {value} | {percentage}%'
            },
            callbacks: {
                onClickSegment: function(a) {
                    renderSubchart(rawData, a);
                }
            }
        });
    }

    function renderSubchart(data, input){
        if(input.data.isGrouped){
            var codeList = [];
            for (i = 0; i < input.data.groupedData.length; i++){
                var tempValue = getcauseKey(input.data.groupedData[i].label);
                codeList.push(tempValue);
            }
            inputLabel = codeList;
        }else{
            inputLabel = getcauseKey(input.data.label);
        }

        subChartData =  nestDataByAge(data, inputLabel);

        if($('svg#subSvg').length == 0) {
            makeSubchart(subChartData, input.data.label);
        }else{
            updateSubchart(subChartData, input.data.label);
        }        
    }

    function anyNaN(array){
        //array input = (11) [Array(2), Array(2),..., Array(2), key: "1", index: 0]
        array.forEach(function(element){
           if(Array.isArray(element)){
               if(isNaN(element[0]) || isNaN(element[1])){
                   return false;
               }
           } 
        });
        return true;
    }

    function makeSubchart(data, titleLabel){
            //init chart elements
            subChartTitle = titleLabel;
            var svg = d3.select('#subChart')
                    .append('svg')
                    .attr('id', 'subSvg')
                    .attr('width', width -750)
                    .attr('height', 550),
            g = svg.append('g').attr('transform', 'translate(' + subChartMargin.left + ',' + subChartMargin.top + ')');
            
            //title
            svg.append('text')
                .attr('class','subchartHeader')
                .attr('x', ((width -750) / 2))             
                .attr('y', (subChartMargin.top / 2))
                .attr('text-anchor', 'middle')  
                .style('font-size', '16px') 
                .style('text-decoration', 'underline')  
                .text('Death rates by age');
            svg.append('text')
                .attr('class','subchartTitle')
                .attr('x', ((width -750) / 2) + 30)             
                .attr('y', (3 * subChartMargin.top / 4))
                .attr('text-anchor', 'middle')  
                .style('font-size', '14px') 
                .text('Cause of death: ' + titleLabel);

            var subHeight = svg.attr("height") - subChartMargin.top - subChartMargin.bottom;

            var x = d3.scaleLinear()
                    .range([0, width - 750 - subChartMargin.left - subChartMargin.right]),
                y = d3.scaleLinear()
                    .domain([0,1])
                    .range([subHeight, 0]),
                z = d3.scaleOrdinal(d3.schemeCategory20);

            var area = d3.area()
                .x(function(d, i) {return x(d.data.year); })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); });

            x.domain(d3.extent(data, function(d) { return d.year; }));
            z.domain(subKeys);
            var series = d3.stack().keys(subKeys).offset(d3.stackOffsetExpand)(data);

            var layer = g.selectAll('.layer')
                        .data(series)
                        .enter()
                        .append('g')
                        .attr('class', 'layer');

            layer.append('path')
                .transition()
                .duration(500)
                .attr('class', function(d) { return 'area ' + d.key; })
                .style('fill', function(d) { return z(d.key); })
                .attr('d', area);

            layer.filter(function(d) { return d[d.length - 1][1] - d[d.length - 1][0] > 0.05; })
                .append('text')               
                .attr('dy', '.35em')
                .style('font', '12px sans-serif')
                .style('text-anchor', 'end')
                .transition()
                .duration(500)
                .attr('x',width - subChartMargin.left - subChartMargin.right - 755 )
                .attr('y', function(d) { return y((d[d.length - 1][0] + d[d.length - 1][1]) / 2); })
                .text(function(d) { return yearText[d.key]; });

            g.append('g')
                  .attr('class', 'axis axis-x')
                  .attr('transform', 'translate(0,' + subHeight + ')')
                  .call(d3.axisBottom(x));
            
            g.append('g')
                  .attr('class', 'axis axis-y')
                  .call(d3.axisLeft(y).ticks(10, '%'));
        
    }

    function updateSubchart(data, titleLabel){
        subChartTitle = titleLabel;
        var svg = d3.select('#subSvg');
        var subHeight = svg.attr("height") - subChartMargin.top - subChartMargin.bottom;

        svg.select('.subchartHeader')
                .attr('x', ((width -750) / 2))             
                .attr('y', (subChartMargin.top / 2));
        svg.select('.subchartTitle')
                .attr('x', ((width -750) / 2) + 30)             
                .attr('y', (3 * subChartMargin.top / 4))
                .text('Cause of death: ' + titleLabel);

        var g = svg.select('g');

        //rest x, y, z winwidth may change
        var x = d3.scaleLinear()
                    .range([0, width - 750 - subChartMargin.left - subChartMargin.right]),
            y = d3.scaleLinear()
                    .domain([0,1])
                    .range([subHeight, 0]),
            z = d3.scaleOrdinal(d3.schemeCategory20);

        var area = d3.area()
                .x(function(d, i) {return x(d.data.year); })
                .y0(function(d) { return y(d[0]); })
                .y1(function(d) { return y(d[1]); });

        x.domain(d3.extent(data, function(d) { return d.year; }));
        z.domain(subKeys);
        var series = d3.stack().keys(subKeys).offset(d3.stackOffsetExpand)(data);
        var layer = g.selectAll('.layer')
                    .data(series);
        layer.select('path')
                .transition()
                .duration(500)
                .attr('d', area);

        layer.selectAll('text').remove();
        layer.filter(function(d) { return d[d.length - 1][1] - d[d.length - 1][0] > 0.05; })
                .append('text')
                .attr('dy', '.35em')
                .style('font', '12px sans-serif')
                .style('text-anchor', 'end')
                .transition()
                .duration(500)
                .attr('x',width - subChartMargin.left - subChartMargin.right - 755 )
                .attr('y', function(d) { return y((d[d.length - 1][0] + d[d.length - 1][1]) / 2); }) 
                .text(function(d) { return yearText[d.key]; });

        g.select('.axis-x')
            .transition()
            .duration(500)
            .attr('class', 'axis axis-x')
            .attr('transform', 'translate(0,' + subHeight + ')')
            .call(d3.axisBottom(x));

    }

    function updateDimensions(winWidth) {
        //check window size -> reset chart size

        margin.top = 70;
        margin.right = 30;
        margin.left = 50;
        margin.bottom = 50;
    
        width = winWidth - margin.left - margin.right;
        height = 550 - margin.top - margin.bottom;
    }

    return {
        render : render
    }
  
})(window,d3);
