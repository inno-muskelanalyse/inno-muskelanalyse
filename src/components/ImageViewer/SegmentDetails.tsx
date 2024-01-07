import { convertFileSrc, invoke } from '@tauri-apps/api/tauri'
import Image from 'next/image'

import { CachedSegment } from '../../../src-tauri/bindings/CachedSegment';
import { Loader2, ChevronsUpDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export type SegmentDetailsProps = {
    segment: CachedSegment;
};

const SegmentDetails = ({ segment }: SegmentDetailsProps) => {
    const { data: image, isLoading, error } = useQuery<string, string>({
        queryKey: [`/api/segments/${segment.uuid}/image`],
        queryFn: () => fetcher(segment)
    });

    if (error) return <div>Beim Laden ist ein Fehler aufgetreten: {error}</div>
    if (isLoading) return (
        <div className="w-full h-full flex flex-col justify-center items-center gap-8">
            <Loader2 className="h-16 w-16 animate-spin" />
        </div>
    )


    return (
        <div className="grid grid-cols-2 gap-2">
            <div className="bg-black p-2 flex flex-col justify-center">
                {image && segment.width && segment.height && <Image src={image} width={segment.width} height={segment.height} alt="" />}
            </div>
            <div>
                {segment.status != "Ok" ? <span>Segment is being analysed</span> : (
                    <div className="text-sm py-4">
                        <p className="font-bold">Length: </p><span>{Math.floor(segment.measured_length!)}</span>
                        <p className="font-bold">Width: </p><span>{Math.floor(segment.measured_width!)}</span>
                        <p className="font-bold">Angle: </p><span>{Math.floor(segment.measured_angle!)}° </span>
                        <ChevronsUpDown className="w-10 m-auto rotate-90" style={{ rotate: `${Math.floor(segment.measured_angle ?? 0)}deg` }} />
                    </div>

                )}
            </div>
        </div>
    )
}

const fetcher = async (segment: CachedSegment) => {
    const image = convertFileSrc(segment.binary_img);

    return image;
}

export default SegmentDetails