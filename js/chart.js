var Chart = (function(window,d3) {
  
  var svg, rawData, dataFixed, dataNested, keyData, displaySelection, unitSelection, ySelection, x, y, xAxis, yAxis, 
      dim, chartWrapper, tooltipDiv, line, margin = {}, width, height, xMax, foundBio, legendSelector;
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
  var lineColor = colorbrewer.Blues[7];
      lineColor.splice(0, 3);
  var legendText = ['Less than 50', 'Between 50 and 100', 'Between 100 and 200', 'More than 200'];
  var legendData = combineToData(legendText, lineColor);
  var lineFilter = [true, true, true, true]; // <50, 50~100, 100~200, >200

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

      //Dose Unit Selection
      unitSelection = 'mg/kg';

      //Set Max Dose
      xMax = 100;

      //Biological Selection
      ySelection = 'ALB';
      foundBio = keyData.filter(function (d){ return d.ASSAY_ABBR === ySelection });

      //Display Selection (median / mean)
      displaySelection = 'median';

      //nest data by Chemical -> Dose
      dataFixed = rawData.filter(function (d) { 
                                                  if( d.DOSE_UNIT === unitSelection && d.DOSE <= xMax )
                                                  {
                                                      return d;
                                                  }
                                              });                                                
      dataNested = nestDataByBio(dataFixed, ySelection);                         
      //initialize scales
      var xExtent = [0, xMax];
      var yExtent = getYextend(dataFixed, ySelection);
      x = d3.scale.linear().domain(xExtent);
      y = d3.scale.linear().domain(yExtent);

      //initialize axis
      xAxis = d3.svg.axis().orient('bottom');
      yAxis = d3.svg.axis().orient('left');

      //draw chart
      line = d3.svg.line()
          .x(function(d) { return x(+d.key); })
          .y(function(d) { return y(+d.values[displaySelection]); })
          .interpolate('linear');

      //initialize svg
      svg = d3.select('#chart')
          .append('svg');
      chartWrapper = svg.append('g');

      chartWrapper.append('g')
          .classed('x axis', true);
      chartWrapper.append('g')
          .classed('y axis', true);

      //initialize tooltip div
      tooltipDiv = d3.select('body')
          .append('div')	
          .attr('class', 'tooltip')				
          .style('opacity', 0);
      
      //initialize select bio buttons    
      var bioButtons = d3.select('#chart')
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

      //initialize legend
      legendSelector = d3.select('#chart')
        .append('div')
        .attr('class', 'legend')
        .selectAll('div')
        .data(legendData)
        .enter()
        .append('div')
        .text(function(d) {return d.key;})
        .style('background-color', function(d) { return d.value; })
        .on('mouseover', function() {
          d3.select(this)
          .style('background-color','steelblue')
        })
        .on('mouseout', function () {
          d3.select(this)
          .style('background-color', function (d) { if(lineFilter[legendText.indexOf(d.key)]){
                                                        return d.value;
                                                    }else{
                                                        return 'gray';
                                                    }})
        })
        .style('color', function(d){
                                    if(d.key === 'More than 200' || d.key === 'Between 100 and 200'){
                                      return 'white';
                                    }else{
                                      return 'black';
                                    }})
        .on('click', legendClick);
      //legend title
      d3.select('#chart')
        .append('div')
        .attr('class', 'legendTitle')
        .text('Data Quality');

      //render the chart
      render();
  }

  function legendClick(d){

    var indexLegend = legendText.indexOf(d.key);

    if(lineFilter[indexLegend]){
        //set display to none
        lineFilter[indexLegend] = false;
        d3.select(this)
            .transition()
            .duration(500)
            .style('text-decoration', 'line-through')
            .style('background', 'gray')
            .style('color', 'black');
    }else{
        //remove display none
        lineFilter[indexLegend] = true;
        d3.select(this)
            .transition()
            .duration(500)
            .style('text-decoration', 'none')
            .style('background', lineColor[indexLegend])
            .style('color', function(d){
                                        if(indexLegend > 1){
                                            return 'white';
                                        }else{
                                            return 'black';
                                        }});
    }

    render();
  }

  function dataUpdate() {
      //update dataset
      dataFixed = rawData.filter(function (d) { 
          if( d.DOSE_UNIT === unitSelection && d.DOSE <= xMax )
          {
              return d;
          }
      });
      dataNested = nestDataByBio(dataFixed, ySelection);
      foundBio = keyData.filter(function (d){ return d.ASSAY_ABBR === ySelection });
      //re-range y-axis
      var yExtent = getYextend(dataFixed, ySelection);
      y = d3.scale.linear().domain(yExtent);
      //reset line with new scale
      line = d3.svg.line()
          .x(function(d) { return x(+d.key); })
          .y(function(d) { return y(+d.values[displaySelection]); })
          .interpolate('linear');

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
              .text('Chemical Effects in Biological System');
          svg.append('text')
              .attr('class', 'titles')
              .attr('x', (width / 2) + 5 )
              .attr('y', 50)
              .style("text-anchor", "middle")
              .text( ySelection + ' (' + foundBio[0].ASSAY_NAME + ')');

          //axis labels
          svg.selectAll('.axisLabel').remove();
          svg.append('text')
              .attr('class', 'axisLabel')
              .attr('x', width / 2 )
              .attr('y', height + margin.top + margin.bottom - 16)
              .style("text-anchor", "middle")
              .text('Dose (' + unitSelection +')');
          svg.append('text')
              .attr('class', 'axisLabel')
              .attr("transform", "translate("+ (margin.left/3) +","+ ((margin.top + height)/2) + ")rotate(-90)")
              .attr("dy", "0.8em")
              .style("text-anchor", "middle")
              .text( ySelection + ' (' + bioUnit[ySelection] +')' );
          
          //remove all lines and re-draw
          chartWrapper.selectAll('path.line').remove();
          chartWrapper.selectAll('path.line')
              .data(dataNested)
              .enter()
              .append('path')
              .classed('line', true)
              .on('mouseover', showTooltip)
              .on('mouseout', hideTooltip)
              .on('click', openDetailwindow)
              .attr('display', function(d){ 
                                            var totalRecord = totalCount(d);
                                            var tempArray = [0, 50, 100, 200];
                                                for (i = 0; i < lineFilter.length; i++){
                                                    if(!lineFilter[i]){
                                                        if(i === 3){
                                                            if(totalRecord > 200) {return 'none';}
                                                        }else{
                                                            if(totalRecord > tempArray[i] && totalRecord <= tempArray[i+1] ){return 'none';}   
                                                        }
                                                    }
                                                }
                                            })
              .attr("d", function(d) {return line(d.values);})
              .attr('stroke', function(d){
                                            var totalRecord = totalCount(d);
                                            if (totalRecord > 200){
                                              return lineColor[3];
                                            }else if(totalRecord > 100){
                                              return lineColor[2];
                                            }else if(totalRecord > 50){
                                              return lineColor[1];
                                            }else{
                                              return lineColor[0];
                                            }
                                          });
          
  }

  function updateDimensions(winWidth) {
      margin.top = 70;
      margin.right = 50;
      margin.left = 50;
      margin.bottom = 50;
  
      width = winWidth - margin.left - margin.right;
      height = 550 - margin.top - margin.bottom;
  }

  function nestDataByBio(data, selection){
      var returnData = d3.nest()
                      .key(function(d){
                          return d.CHEMICAL_NAME;
                      })
                      .key(function(d){
                          if(isNaN(d.DOSE))
                              d.DOSE = 0;
                          return +d.DOSE;
                      }).sortKeys((a, b) => a - b)
                      .rollup(function(leaves){
                          var median_value = d3.median(leaves, function(d) {
                              return +d[selection];
                          });
                          var mean_value = d3.mean(leaves, function(d) {
                              return +d[selection];
                          });
                          return {
                              'median' : median_value,
                              'mean' : mean_value,
                              'count' : leaves.length
                          };
                      })
                      .entries(data);
      return returnData;
  }

  function totalCount(d){
    var total = 0;
    for (i = 0; i < d.values.length; i++){
      total += d.values[i].values['count'];
    }
    return total;
  }

  function getYextend(data, selection){
      var displayYmax = 2 * d3.median(data, function(d){ return +d[selection]; });
      return [0, displayYmax];
  }

  function showTooltip(d){
      var chemicalName =  d.key;
      var infoRow = dataFixed.filter(function (d) { return d.CHEMICAL_NAME === chemicalName; });
      var studyTitle = infoRow[0]['STUDY_TITLE'];
      var accessionNumber = infoRow[0]['ACCESSION_NUMBER'];
      var organization = infoRow[0]['ORGANIZATION_NAME'];

      

      var print_html = '<div class="tooltipTable">' +
                          '<div class="tooltipTableBody">' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell">Chemical Name:</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell"> &nbsp;' + chemicalName + '</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell">Organization Name:</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell"> &nbsp;' + organization + '</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell">Study Title:</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell"> &nbsp;' + studyTitle + '</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell">Accession Number:</div>' +
                              '</div>' +
                              '<div class="tooltipTableRow">' +
                                  '<div class="tooltipTableCell"> &nbsp;' + accessionNumber + '</div>' +
                              '</div>' +
                          '</div></div>';

      tooltipDiv.transition()
          .duration(400)
          .style('opacity', 0.9);
      tooltipDiv.html(print_html)
          .style('left', (d3.event.pageX) + 'px')		
          .style('top', (d3.event.pageY - 28) + 'px');
      
  }
  function hideTooltip(d){
      tooltipDiv.transition()
          .duration(600)
          .style('opacity', 0);
  }
  
  function openDetailwindow(d){
      var chemicalUrl = '/projects/chemicalCEBS?chemical_name='+ d.key;
      window.location = chemicalUrl;
  }

  function combineToData(keys, values) {
    var result = [];
    for (var i = 0; i < keys.length; i++)
         result[i] = {'key':keys[i], 'value': values[i]} ;
    return result;
  }

  function handleClick(event){
      //reset X-axis
      if (document.getElementById('xmax').value === ""){
          xMax = 100;
      } else if (!isNaN(document.getElementById('xmax').value)){
          xMax = +document.getElementById('xmax').value;
      }else{
          xMax = 100;
          document.getElementById('xmax').value = 100;
      }       
      var xExtent = [0, xMax];
      x = d3.scale.linear().domain(xExtent);

      //filter dose unit
      if (document.getElementById('mg/kg').checked) {
          unitSelection = 'mg/kg';
      }
      if (document.getElementById('ppm').checked) {
          unitSelection = 'ppm';
      }

      //Set display mode
      if (document.getElementById('mean').checked) {
          displaySelection = 'mean';
      }
      if (document.getElementById('median').checked) {
          displaySelection = 'median';
      }
      
      dataUpdate();
      render();
      return false;
  }

  return {
      render : render,
      handleClick : handleClick
  }

})(window,d3);
