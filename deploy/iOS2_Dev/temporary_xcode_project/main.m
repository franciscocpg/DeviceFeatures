//
//  main.m
//  Oracle_ADFmc_Container_Template
//
/*
 Copyright (c) 2011 Oracle.
 All rights reserved. 
 */

@import UIKit;

int main(int argc, char *argv[]) 
{
    int retVal = 0;
    @autoreleasepool
    {
        // Add perf timestamp
        double TimeStamp = (double)([[NSDate date] timeIntervalSince1970] * (1000));
        NSLog(@"Perf log: Application startup, timestamp: %f",  TimeStamp );
        retVal = UIApplicationMain(argc, argv, nil, @"AdfmfApplicationDelegate");
    }
    return retVal;
        
}
