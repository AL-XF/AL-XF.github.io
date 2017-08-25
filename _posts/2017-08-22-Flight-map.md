---
layout: post
title: "Flight map"
date: 2017-08-22
---
## Summary
A map plot use circle size that summarizes rate of delay flights and 
rate of Canceled or Deiverted Flight in each US airport between 2006 
and 2016. Data from the [RITA](http://www.transtats.bts.gov/OT_Delay/OT_DelayCause1.asp) 
filter year between 2006 and 2016. Viewers are able to zoom in to see 
individual airport information by year.

## Desgin
Chart type: map (proportional symbol map)
Visual encoding: 
* Airports (location) - Encoding: Center of bubbles (Geography Position).
    It shows all airport locations on the map very clear.
* Rate - Encoding: circle area size (Square root of Variables -> Radius).
    Circle area size = \pi \times radius^2, if I want to present the varibales
    by area size, I need radius of my circle is proportional to the sqaure root 
    of variables
* Type - Encoding: color hue.
    Using orange and red to separate types. In general, people use orange for warning,
    and red for more serious than warning. Therefore, I selected orange for delay, and
    red for the more serious situation - canceled or diverted.
The data being presented on a US map, radius of circle is presenting 
how serious the delay or not arrived situation in each airport. During 
the period of this dataset, the rates of dalay and not arrived are 
decresed. Each year is displayed separately in order to allow the viewer 
to know the change. The number of circles changing by year, the viewer 
is able to recognize new airport opened or old airport shut down. It also 
help the viewer plan his/her direct flight select the intermediate point 
which is a lower rate of delay airport.

## Feedback
1.  Delay flights and Canceled flights are slightly reduced from 2006 to 2016. (This version is index7.html)
..* The base map color doesn't mean anything, confuse viewers.
..* The color of left buttons list is similar to the delay circle; better use another color to split them.
..* To add a slider for year changing may be better.

2.  A feedback from [Udacity Forum](https://discussions.udacity.com/t/seeking-feedback-for-flight-delay-data-project/330691) (This version is index8.html)
..* It would be great if one could select different carriers or airports (say top 10) to limit the amount of information.

## Resources
* [D3 API](https://github.com/d3/d3/blob/master/API.md)
* [mousewheel-zoom + click-to-center](https://bl.ocks.org/mbostock/2206340)
* [rangeslider.js](http://rangeslider.js.org/)
